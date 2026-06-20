import {
  Alert,
  Autocomplete,
  Box,
  Grid,
  Stack,
  TextField
} from '@mui/material';
import InputHeader from '@components/InputHeader';
import NumericInputWithUnit from '@components/input/NumericInputWithUnit';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import type { ToolComponentProps } from '@tools/defineTool';
import { dataTableLookup } from 'datatables';
import Qty from 'js-quantities';
import nerdamer from 'nerdamer-prime';
import 'nerdamer-prime/Algebra';
import 'nerdamer-prime/Solve';
import 'nerdamer-prime/Calculus';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validNamespaces } from '../../../../i18n';
import { CompactNumberSelect, NumberOptionStack } from '../NumberToolControls';
import type { InitialValuesType } from './types';
import type { AlternativeVarInfo, GenericCalcType } from './data/types';
import type { JSXElementConstructor } from 'react';

type VarValue = {
  value: number;
  unit: string;
};

function numericSolveEquationFor(
  equation: string,
  varName: string,
  variables: { [key: string]: number }
) {
  let expr = nerdamer(equation);
  for (const key in variables) {
    expr = expr.sub(key, variables[key].toString());
  }

  let result: nerdamer.Expression | nerdamer.Expression[] =
    expr.solveFor(varName);

  if ((result as unknown as nerdamer.Expression).toDecimal === undefined) {
    result = (result as unknown as nerdamer.Expression[])[0];
  }

  return parseFloat(
    (result as unknown as nerdamer.Expression).evaluate().toDecimal()
  );
}

function cloneValues(values: InitialValuesType): InitialValuesType {
  return {
    outputVariable: values.outputVariable,
    presets: { ...values.presets },
    vars: Object.fromEntries(
      Object.entries(values.vars).map(([key, value]) => [key, { ...value }])
    )
  };
}

function createInitialValues(calcData: GenericCalcType): InitialValuesType {
  const values: InitialValuesType = {
    outputVariable: '',
    vars: {},
    presets: {}
  };

  calcData.variables.forEach((variable) => {
    if (variable.default === undefined) {
      values.vars[variable.name] = {
        value: 0,
        unit: variable.unit
      };
      values.outputVariable = variable.name;
    } else {
      values.vars[variable.name] = {
        value: variable.default || 0,
        unit: variable.unit
      };
    }
  });

  calcData.presets?.forEach((selection) => {
    values.presets[selection.title] = selection.default;
    if (selection.default === '<custom>') return;

    for (const key in selection.bind) {
      values.vars[key] = {
        value: dataTableLookup(selection.source, selection.default)[
          selection.bind[key]
        ],
        unit: selection.source.columns[selection.bind[key]]?.unit || ''
      };
    }
  });

  return values;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Number.parseFloat(value.toPrecision(12)).toString();
}

function getAlternate(
  alternateInfo: AlternativeVarInfo,
  mainInfo: GenericCalcType['variables'][number],
  mainValue: VarValue
) {
  if (Number.isNaN(mainValue.value)) return NaN;
  const canonicalValue = Qty(mainValue.value, mainValue.unit).to(
    mainInfo.unit
  ).scalar;

  return numericSolveEquationFor(alternateInfo.formula, 'x', {
    v: canonicalValue
  });
}

function getMainFromAlternate(
  alternateInfo: AlternativeVarInfo,
  mainInfo: GenericCalcType['variables'][number],
  alternateValue: VarValue
) {
  if (Number.isNaN(alternateValue.value)) return NaN;
  const canonicalValue = Qty(alternateValue.value, alternateValue.unit).to(
    alternateInfo.unit
  ).scalar;

  return numericSolveEquationFor(alternateInfo.formula, 'v', {
    x: canonicalValue
  });
}

export default async function makeTool(
  calcData: GenericCalcType
): Promise<JSXElementConstructor<ToolComponentProps>> {
  return function GenericCalc({ title }: ToolComponentProps) {
    const { t } = useTranslation(validNamespaces);
    const [values, setValues] = useState<InitialValuesType>(() =>
      createInitialValues(calcData)
    );
    const [valsBoundToPreset, setValsBoundToPreset] = useState<
      Record<string, string>
    >({});
    const [extraOutputs, setExtraOutputs] = useState<Record<string, number>>(
      {}
    );
    const [error, setError] = useState('');

    const solveOptions = useMemo(
      () =>
        calcData.variables
          .filter(
            (variable) =>
              valsBoundToPreset[variable.name] === undefined &&
              variable.solvable !== false
          )
          .map((variable) => ({
            label: variable.title,
            value: variable.name
          })),
      [valsBoundToPreset]
    );

    const updateValues = (
      updater: (current: InitialValuesType) => InitialValuesType
    ) => {
      setValues((current) => updater(cloneValues(current)));
    };

    const updateVarField = (name: string, value: number, unit: string) => {
      updateValues((current) => {
        current.vars[name] = { value, unit };
        return current;
      });
    };

    const handleSelectedPresetChange = (selection: string, preset: string) => {
      const selectionData = calcData.presets?.find(
        (item) => item.title === selection
      );

      setValsBoundToPreset((current) => {
        const next = { ...current };
        Object.keys(next).forEach((key) => {
          if (next[key] === selection) delete next[key];
        });

        if (selectionData && preset && preset !== '<custom>') {
          Object.keys(selectionData.bind).forEach((key) => {
            next[key] = selection;
          });
        }

        return next;
      });

      updateValues((current) => {
        current.presets[selection] = preset;

        if (selectionData && preset && preset !== '<custom>') {
          for (const key in selectionData.bind) {
            current.vars[key] = {
              value: dataTableLookup(selectionData.source, preset)[
                selectionData.bind[key]
              ],
              unit:
                selectionData.source.columns[selectionData.bind[key]]?.unit ||
                ''
            };

            if (current.outputVariable === key) current.outputVariable = '';
          }
        }

        return current;
      });
    };

    const solveCurrentValues = (
      currentValues: InitialValuesType
    ): {
      solvedValues: InitialValuesType;
      solvedExtraOutputs: Record<string, number>;
    } => {
      if (!currentValues.outputVariable) {
        throw new Error(t('number:common.selectSolveTarget'));
      }

      const solvedValues = cloneValues(currentValues);
      const targetVariable = calcData.variables.find(
        (variable) => variable.name === solvedValues.outputVariable
      );
      const baseFormula = targetVariable?.formula || calcData.formula;
      let expr = nerdamer(baseFormula);

      Object.keys(solvedValues.vars).forEach((key) => {
        if (key === solvedValues.outputVariable) return;
        expr = expr.sub(key, solvedValues.vars[key].value.toString());
      });

      let result: nerdamer.Expression | nerdamer.Expression[] = expr.solveFor(
        solvedValues.outputVariable
      );

      if ((result as unknown as nerdamer.Expression).toDecimal === undefined) {
        if ((result as unknown as nerdamer.Expression[])?.length < 1) {
          solvedValues.vars[solvedValues.outputVariable].value = NaN;
          throw new Error(t('number:common.noSolution'));
        }
        result = (result as unknown as nerdamer.Expression[])[0];
      }

      solvedValues.vars[solvedValues.outputVariable].value = parseFloat(
        (result as unknown as nerdamer.Expression).evaluate().toDecimal()
      );

      const solvedExtraOutputs: Record<string, number> = {};
      calcData.extraOutputs?.forEach((extraOutput) => {
        let extraExpr = nerdamer(extraOutput.formula);
        Object.keys(solvedValues.vars).forEach((key) => {
          extraExpr = extraExpr.sub(
            key,
            solvedValues.vars[key].value.toString()
          );
        });
        solvedExtraOutputs[extraOutput.title] = parseFloat(
          extraExpr.evaluate().toDecimal()
        );
      });

      return { solvedValues, solvedExtraOutputs };
    };

    useEffect(() => {
      try {
        const { solvedValues, solvedExtraOutputs } = solveCurrentValues(values);
        setExtraOutputs(solvedExtraOutputs);
        setError('');

        const target = values.outputVariable;
        const currentValue = values.vars[target]?.value;
        const solvedValue = solvedValues.vars[target]?.value;
        if (!Object.is(currentValue, solvedValue)) {
          setValues(solvedValues);
        }
      } catch (error) {
        setExtraOutputs({});
        setError(
          error instanceof Error ? error.message : t('number:common.solveError')
        );
      }
    }, [values, t]);

    const resultText = (() => {
      const targetVariable = calcData.variables.find(
        (variable) => variable.name === values.outputVariable
      );
      if (!targetVariable) return '';

      const targetValue = values.vars[targetVariable.name];
      const lines = [
        `${targetVariable.title}: ${formatNumber(targetValue.value)} ${
          targetValue.unit
        }`.trim()
      ];

      calcData.extraOutputs?.forEach((extraOutput) => {
        lines.push(
          `${extraOutput.title}: ${formatNumber(
            extraOutputs[extraOutput.title]
          )} ${extraOutput.unit}`.trim()
        );
      });

      return lines.join('\n');
    })();

    return (
      <Box>
        <ToolInputAndResult
          input={
            <Box>
              <InputHeader title={title} />
              <NumberOptionStack>
                {calcData.presets?.map((preset) => (
                  <Autocomplete
                    key={preset.title}
                    disablePortal
                    value={values.presets[preset.title]}
                    options={[
                      '<custom>',
                      ...Object.keys(preset.source.data).sort()
                    ]}
                    onChange={(_, nextValue) =>
                      handleSelectedPresetChange(preset.title, nextValue || '')
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={preset.title}
                        size="small"
                        sx={{ backgroundColor: 'background.paper' }}
                      />
                    )}
                  />
                ))}
                <CompactNumberSelect
                  label={t('number:common.solveFor')}
                  value={values.outputVariable}
                  options={[
                    {
                      label: t('number:common.selectSolveTarget'),
                      value: ''
                    },
                    ...solveOptions
                  ]}
                  onChange={(outputVariable) =>
                    updateValues((current) => ({
                      ...current,
                      outputVariable
                    }))
                  }
                />
                <Stack spacing={2}>
                  {calcData.variables.map((variable) => (
                    <Box key={variable.name}>
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <Box>{variable.title}</Box>
                        </Grid>
                        <Grid item xs={12} md={9}>
                          <NumericInputWithUnit
                            defaultPrefix={variable.defaultPrefix}
                            value={
                              values.vars[variable.name] || {
                                value: NaN,
                                unit: variable.unit
                              }
                            }
                            disabled={
                              values.outputVariable === variable.name ||
                              valsBoundToPreset[variable.name] !== undefined
                            }
                            disableChangingUnit={
                              valsBoundToPreset[variable.name] !== undefined
                            }
                            onOwnChange={(value) =>
                              updateVarField(
                                variable.name,
                                value.value,
                                value.unit
                              )
                            }
                          />
                        </Grid>
                      </Grid>
                      {variable.alternates?.map((alternate) => (
                        <Grid
                          key={alternate.title}
                          container
                          spacing={1.5}
                          alignItems="center"
                          sx={{ mt: 1 }}
                        >
                          <Grid item xs={12} md={3}>
                            <Box>{alternate.title}</Box>
                          </Grid>
                          <Grid item xs={12} md={9}>
                            <NumericInputWithUnit
                              defaultPrefix={alternate.defaultPrefix || ''}
                              value={{
                                value:
                                  getAlternate(
                                    alternate,
                                    variable,
                                    values.vars[variable.name]
                                  ) || NaN,
                                unit: alternate.unit || ''
                              }}
                              disabled={
                                values.outputVariable === variable.name ||
                                valsBoundToPreset[variable.name] !== undefined
                              }
                              disableChangingUnit={
                                valsBoundToPreset[variable.name] !== undefined
                              }
                              onOwnChange={(value) =>
                                updateVarField(
                                  variable.name,
                                  getMainFromAlternate(
                                    alternate,
                                    variable,
                                    value
                                  ),
                                  variable.unit
                                )
                              }
                            />
                          </Grid>
                        </Grid>
                      ))}
                    </Box>
                  ))}
                </Stack>
              </NumberOptionStack>
            </Box>
          }
          result={
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <ToolTextResult
                title={t('number:common.result')}
                value={error ? '' : resultText}
                monospace
              />
            </Stack>
          }
        />
      </Box>
    );
  };
}
