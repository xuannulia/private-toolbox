import React, { ReactNode, useContext, useEffect } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography
} from '@mui/material';
import { Formik, FormikValues, useFormikContext } from 'formik';
import ToolOptions, { GetGroupsType } from '@components/options/ToolOptions';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolInfo from '@components/ToolInfo';
import ToolExamples, {
  CardExampleType
} from '@components/examples/ToolExamples';
import { ToolComponentProps } from '@tools/defineTool';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';

const FormikListenerComponent = <T,>({
  input,
  compute,
  onValuesChange
}: {
  input: any;
  compute: (optionsValues: T, input: any) => void;
  onValuesChange?: (values: T) => void;
}) => {
  const { values } = useFormikContext<T>();
  const { showSnackBar } = useContext(CustomSnackBarContext);

  React.useEffect(() => {
    try {
      compute(values, input);
    } catch (exception: unknown) {
      if (exception instanceof Error) showSnackBar(exception.message, 'error');
      else console.error(exception);
    }
  }, [values, input, showSnackBar]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);
  return null; // This component doesn't render anything
};

interface ToolContentProps<Options, Input> extends ToolComponentProps {
  inputComponent?: ReactNode;
  resultComponent?: ReactNode;
  renderCustomInput?: (
    values: Options,
    setFieldValue: (fieldName: string, value: any) => void
  ) => ReactNode;
  initialValues: Options;
  /**
   * should return non-empty array or null
   */
  getGroups: GetGroupsType<Options> | null;
  compute: (optionsValues: Options, input: Input) => void;
  toolInfo?: {
    title: string;
    description?: string;
  };
  input?: Input;
  exampleCards?: CardExampleType<Options>[];
  setInput?: React.Dispatch<React.SetStateAction<Input>>;
  validationSchema?: any;
  onValuesChange?: (values: Options) => void;
  verticalGroups?: boolean;
}

export default function ToolContent<T extends FormikValues, I>({
  title,
  inputComponent,
  resultComponent,
  initialValues,
  getGroups,
  compute,
  toolInfo,
  exampleCards,
  input,
  setInput,
  validationSchema,
  renderCustomInput,
  onValuesChange,
  verticalGroups
}: ToolContentProps<T, I>) {
  const { t } = useTranslation();

  return (
    <Box>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={() => {}}
      >
        {({ values, setFieldValue }) => {
          return (
            <>
              <ToolInputAndResult
                input={
                  inputComponent ??
                  (renderCustomInput &&
                    renderCustomInput(values, setFieldValue))
                }
                result={resultComponent}
              />
              <FormikListenerComponent<T>
                compute={compute}
                input={input}
                onValuesChange={onValuesChange}
              />
              <ToolOptions getGroups={getGroups} vertical={verticalGroups} />

              {toolInfo && toolInfo.title && toolInfo.description && (
                <Accordion
                  disableGutters
                  TransitionProps={{ unmountOnExit: true }}
                  sx={{
                    mt: 3,
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 'none',
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>{toolInfo.title}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <ToolInfo
                      title={toolInfo.title}
                      description={toolInfo.description}
                    />
                  </AccordionDetails>
                </Accordion>
              )}

              {exampleCards && exampleCards.length > 0 && (
                <Accordion
                  disableGutters
                  TransitionProps={{ unmountOnExit: true }}
                  sx={{
                    mt: 2,
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 'none',
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>
                      {t('toolExamples.title', { title })}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <ToolExamples
                      title={title}
                      exampleCards={exampleCards}
                      getGroups={getGroups}
                      setInput={setInput}
                    />
                  </AccordionDetails>
                </Accordion>
              )}
            </>
          );
        }}
      </Formik>
    </Box>
  );
}
