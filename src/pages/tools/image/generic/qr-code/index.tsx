import React, { useContext, useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TextFieldWithDesc from '@components/options/TextFieldWithDesc';
import SelectWithDesc from '@components/options/SelectWithDesc';
import CheckboxWithDesc from '@components/options/CheckboxWithDesc';
import {
  InitialValuesType,
  QRCodeType,
  QrCodeErrorCorrectionLevel,
  QrCodeModuleStyle,
  QrCodeOutputFormat,
  WifiEncryptionType
} from './types';
import ColorSelector from '@components/options/ColorSelector';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { useTranslation } from 'react-i18next';
import { generateQrCode } from '@private-toolbox/core';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import { ImageOptionStack } from '../../ImageToolControls';

const initialValues: InitialValuesType = {
  qrCodeType: 'URL',

  // Common settings
  size: '200',
  margin: '4',
  outputFormat: 'png',
  bgColor: '#FFFFFF',
  fgColor: '#000000',
  transparentBackground: false,
  errorCorrectionLevel: 'M',
  moduleStyle: 'square',
  logoDataUrl: '',
  logoName: '',
  logoSizePercent: '18',
  logoPadding: '1',

  // URL
  url: 'https://example.com',

  // Text
  text: '',

  // Email
  emailAddress: '',
  emailSubject: '',
  emailBody: '',

  // Phone
  phoneNumber: '',

  // SMS
  smsNumber: '',
  smsMessage: '',

  // WiFi
  wifiSsid: '',
  wifiPassword: '',
  wifiEncryption: 'WPA',

  // vCard
  vCardName: '',
  vCardEmail: '',
  vCardPhone: '',
  vCardAddress: '',
  vCardCompany: '',
  vCardTitle: '',
  vCardWebsite: ''
};

// Function to format the QR code data based on the type
const formatQRCodeData = (values: InitialValuesType): string => {
  switch (values.qrCodeType) {
    case 'URL':
      return values.url;

    case 'Text':
      return values.text;

    case 'Email': {
      let emailData = `mailto:${values.emailAddress}`;
      if (values.emailSubject || values.emailBody) {
        emailData += '?';
        if (values.emailSubject) {
          emailData += `subject=${encodeURIComponent(values.emailSubject)}`;
        }
        if (values.emailBody) {
          emailData += `${
            values.emailSubject ? '&' : ''
          }body=${encodeURIComponent(values.emailBody)}`;
        }
      }
      return emailData;
    }
    case 'Phone':
      return `tel:${values.phoneNumber}`;

    case 'SMS':
      return `sms:${values.smsNumber}${
        values.smsMessage
          ? `?body=${encodeURIComponent(values.smsMessage)}`
          : ''
      }`;

    case 'WiFi': {
      const encryption =
        values.wifiEncryption === 'None' ? 'nopass' : values.wifiEncryption;
      return `WIFI:T:${encryption};S:${values.wifiSsid};P:${values.wifiPassword};;`;
    }
    case 'vCard':
      return `BEGIN:VCARD
VERSION:3.0
N:${values.vCardName}
FN:${values.vCardName}
ORG:${values.vCardCompany}
TITLE:${values.vCardTitle}
TEL:${values.vCardPhone}
EMAIL:${values.vCardEmail}
ADR:${values.vCardAddress}
URL:${values.vCardWebsite}
END:VCARD`;

    default:
      return '';
  }
};

const readLogoAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read logo image'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () =>
      reject(reader.error || new Error('Failed to read logo image'));
    reader.readAsDataURL(file);
  });

const svgToFile = (svg: string): File =>
  new File([svg], 'qr-code.svg', {
    type: 'image/svg+xml'
  });

const svgToPngFile = (svg: string, size: number): Promise<File> =>
  new Promise((resolve, reject) => {
    const blob = new Blob([svg], {
      type: 'image/svg+xml;charset=utf-8'
    });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas is not available'));
        return;
      }

      context.clearRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);
      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(objectUrl);
        if (!pngBlob) {
          reject(new Error('Failed to render QR code PNG'));
          return;
        }

        resolve(
          new File([pngBlob], 'qr-code.png', {
            type: 'image/png'
          })
        );
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to render QR code SVG'));
    };
    image.src = objectUrl;
  });

type UpdateField = <TKey extends keyof InitialValuesType>(
  key: TKey,
  value: InitialValuesType[TKey]
) => void;

export default function QRCodeGenerator() {
  const { t } = useTranslation('image');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [options, setOptions] = useState<InitialValuesType>(initialValues);
  const [result, setResult] = useState<File | null>(null);

  const updateField: UpdateField = (key, value) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  const getGroups = (values: InitialValuesType, updateField: UpdateField) => {
    return [
      {
        title: t('qrCode.groups.type'),
        component: (
          <Box>
            <SelectWithDesc
              selected={values.qrCodeType}
              onChange={(value) =>
                updateField('qrCodeType', value as QRCodeType)
              }
              options={[
                { label: 'URL', value: 'URL' },
                { label: 'Text', value: 'Text' },
                { label: 'Email', value: 'Email' },
                { label: 'Phone', value: 'Phone' },
                { label: 'SMS', value: 'SMS' },
                { label: 'WiFi', value: 'WiFi' },
                { label: 'vCard', value: 'vCard' }
              ]}
              description={t('qrCode.options.qrType')}
            />
          </Box>
        )
      },
      {
        title: t('qrCode.groups.settings'),
        component: (
          <Box>
            <SelectWithDesc
              selected={values.outputFormat}
              onChange={(value) =>
                updateField('outputFormat', value as QrCodeOutputFormat)
              }
              options={[
                { label: 'PNG', value: 'png' },
                { label: 'SVG', value: 'svg' }
              ]}
              description={t('qrCode.options.outputFormat')}
            />
            <TextFieldWithDesc
              value={values.size}
              onOwnChange={(val) => updateField('size', val)}
              description={t('qrCode.options.size')}
              inputProps={{
                type: 'number',
                min: 100,
                max: 1000
              }}
            />
            <TextFieldWithDesc
              value={values.margin}
              onOwnChange={(val) => updateField('margin', val)}
              description={t('qrCode.options.margin')}
              inputProps={{
                type: 'number',
                min: 0,
                max: 20
              }}
            />
            <SelectWithDesc
              selected={values.errorCorrectionLevel}
              onChange={(value) =>
                updateField(
                  'errorCorrectionLevel',
                  value as QrCodeErrorCorrectionLevel
                )
              }
              options={[
                { label: 'L', value: 'L' },
                { label: 'M', value: 'M' },
                { label: 'Q', value: 'Q' },
                { label: 'H', value: 'H' }
              ]}
              description={t('qrCode.options.errorCorrectionLevel')}
            />
            <SelectWithDesc
              selected={values.moduleStyle}
              onChange={(value) =>
                updateField('moduleStyle', value as QrCodeModuleStyle)
              }
              options={[
                { label: t('qrCode.options.square'), value: 'square' },
                { label: t('qrCode.options.dots'), value: 'dots' }
              ]}
              description={t('qrCode.options.moduleStyle')}
            />
            <ColorSelector
              description={t('qrCode.options.backgroundColor')}
              value={values.bgColor}
              onColorChange={(val) => updateField('bgColor', val)}
            />
            <ColorSelector
              description={t('qrCode.options.foregroundColor')}
              value={values.fgColor}
              onColorChange={(val) => updateField('fgColor', val)}
            />
            <CheckboxWithDesc
              checked={values.transparentBackground}
              onChange={(checked) =>
                updateField('transparentBackground', checked)
              }
              title={t('qrCode.options.transparentBackground')}
            />
          </Box>
        )
      },
      {
        title: t('qrCode.groups.logo'),
        component: (
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                component="label"
                startIcon={<UploadFileIcon />}
                variant="outlined"
              >
                {t('qrCode.options.logoUpload')}
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    event.currentTarget.value = '';

                    if (!file) return;
                    if (!file.type.startsWith('image/')) {
                      showSnackBar(t('qrCode.logoInvalid'), 'error');
                      return;
                    }

                    readLogoAsDataUrl(file)
                      .then((dataUrl) => {
                        updateField('logoDataUrl', dataUrl);
                        updateField('logoName', file.name);
                      })
                      .catch((error) =>
                        showSnackBar(
                          error instanceof Error
                            ? error.message
                            : t('qrCode.logoInvalid'),
                          'error'
                        )
                      );
                  }}
                />
              </Button>
              <Button
                disabled={!values.logoDataUrl}
                onClick={() => {
                  updateField('logoDataUrl', '');
                  updateField('logoName', '');
                }}
                startIcon={<CloseIcon />}
              >
                {t('qrCode.options.logoRemove')}
              </Button>
            </Stack>
            {values.logoName && (
              <Typography
                color="text.secondary"
                sx={{ mb: 2, overflowWrap: 'anywhere' }}
                variant="body2"
              >
                {values.logoName}
              </Typography>
            )}
            <TextFieldWithDesc
              value={values.logoSizePercent}
              onOwnChange={(val) => updateField('logoSizePercent', val)}
              description={t('qrCode.options.logoSize')}
              disabled={!values.logoDataUrl}
              inputProps={{
                type: 'number',
                min: 5,
                max: 30
              }}
            />
            <TextFieldWithDesc
              value={values.logoPadding}
              onOwnChange={(val) => updateField('logoPadding', val)}
              description={t('qrCode.options.logoPadding')}
              disabled={!values.logoDataUrl}
              inputProps={{
                type: 'number',
                min: 0,
                max: 8
              }}
            />
          </Box>
        )
      },
      // Dynamic form fields based on QR code type
      {
        title: t('qrCode.groups.details', { type: values.qrCodeType }),
        component: (
          <Box>
            {values.qrCodeType === 'URL' && (
              <TextFieldWithDesc
                value={values.url}
                onOwnChange={(val) => updateField('url', val)}
                description={t('qrCode.options.url')}
                inputProps={{
                  placeholder: 'https://example.com'
                }}
              />
            )}

            {values.qrCodeType === 'Text' && (
              <TextFieldWithDesc
                value={values.text}
                onOwnChange={(val) => updateField('text', val)}
                description={t('qrCode.options.text')}
                multiline
                rows={4}
                inputProps={{
                  placeholder: 'Lorem Ipsum'
                }}
              />
            )}

            {values.qrCodeType === 'Email' && (
              <>
                <TextFieldWithDesc
                  value={values.emailAddress}
                  onOwnChange={(val) => updateField('emailAddress', val)}
                  description={t('qrCode.options.email')}
                  inputProps={{
                    placeholder: 'example@example.com',
                    type: 'email'
                  }}
                />
                <TextFieldWithDesc
                  value={values.emailSubject}
                  onOwnChange={(val) => updateField('emailSubject', val)}
                  description={t('qrCode.options.emailSubject')}
                  inputProps={{
                    placeholder: 'Subject line'
                  }}
                />
                <TextFieldWithDesc
                  value={values.emailBody}
                  onOwnChange={(val) => updateField('emailBody', val)}
                  description={t('qrCode.options.emailBody')}
                  multiline
                  rows={4}
                  inputProps={{
                    placeholder: 'Body text'
                  }}
                />
              </>
            )}

            {values.qrCodeType === 'Phone' && (
              <TextFieldWithDesc
                value={values.phoneNumber}
                onOwnChange={(val) => updateField('phoneNumber', val)}
                description={t('qrCode.options.phone')}
                inputProps={{
                  placeholder: '+1234567890',
                  type: 'tel'
                }}
              />
            )}

            {values.qrCodeType === 'SMS' && (
              <>
                <TextFieldWithDesc
                  value={values.smsNumber}
                  onOwnChange={(val) => updateField('smsNumber', val)}
                  description={t('qrCode.options.phone')}
                  inputProps={{
                    placeholder: '+1234567890',
                    type: 'tel'
                  }}
                />
                <TextFieldWithDesc
                  value={values.smsMessage}
                  onOwnChange={(val) => updateField('smsMessage', val)}
                  description={t('qrCode.options.message')}
                  multiline
                  rows={4}
                  inputProps={{
                    placeholder: 'Lorem Ipsum'
                  }}
                />
              </>
            )}

            {values.qrCodeType === 'WiFi' && (
              <>
                <TextFieldWithDesc
                  value={values.wifiSsid}
                  onOwnChange={(val) => updateField('wifiSsid', val)}
                  description={t('qrCode.options.ssid')}
                  inputProps={{
                    placeholder: 'WIFI name'
                  }}
                />
                <TextFieldWithDesc
                  value={values.wifiPassword}
                  onOwnChange={(val) => updateField('wifiPassword', val)}
                  description={t('qrCode.options.password')}
                  inputProps={{
                    placeholder: '******',
                    type: 'password'
                  }}
                />
                <SelectWithDesc
                  selected={values.wifiEncryption}
                  onChange={(value) =>
                    updateField('wifiEncryption', value as WifiEncryptionType)
                  }
                  options={[
                    { label: 'WPA', value: 'WPA' },
                    { label: 'WEP', value: 'WEP' },
                    { label: 'None', value: 'None' }
                  ]}
                  description={t('qrCode.options.encryptionType')}
                />
              </>
            )}

            {values.qrCodeType === 'vCard' && (
              <>
                <TextFieldWithDesc
                  value={values.vCardName}
                  onOwnChange={(val) => updateField('vCardName', val)}
                  description={t('qrCode.options.fullName')}
                  inputProps={{
                    placeholder: 'John Doe'
                  }}
                />
                <TextFieldWithDesc
                  value={values.vCardEmail}
                  onOwnChange={(val) => updateField('vCardEmail', val)}
                  description={t('qrCode.options.email')}
                  inputProps={{
                    placeholder: 'john@example.com',
                    type: 'email'
                  }}
                />
                <TextFieldWithDesc
                  value={values.vCardPhone}
                  onOwnChange={(val) => updateField('vCardPhone', val)}
                  description={t('qrCode.options.phone')}
                  inputProps={{
                    placeholder: '+1234567890',
                    type: 'tel'
                  }}
                />
                <TextFieldWithDesc
                  value={values.vCardAddress}
                  onOwnChange={(val) => updateField('vCardAddress', val)}
                  description={t('qrCode.options.address')}
                  inputProps={{
                    placeholder: '123 Main St, City, Country'
                  }}
                />
                <TextFieldWithDesc
                  value={values.vCardCompany}
                  onOwnChange={(val) => updateField('vCardCompany', val)}
                  description={t('qrCode.options.company')}
                  inputProps={{
                    placeholder: 'Company name'
                  }}
                />
                <TextFieldWithDesc
                  value={values.vCardTitle}
                  onOwnChange={(val) => updateField('vCardTitle', val)}
                  description={t('qrCode.options.job')}
                  inputProps={{
                    placeholder: 'Software Developer'
                  }}
                />
                <TextFieldWithDesc
                  value={values.vCardWebsite}
                  onOwnChange={(val) => updateField('vCardWebsite', val)}
                  description={t('qrCode.options.website')}
                  inputProps={{
                    placeholder: 'https://example.com'
                  }}
                />
              </>
            )}
          </Box>
        )
      }
    ];
  };

  const compute = async (options: InitialValuesType) => {
    const qrValue = formatQRCodeData(options);
    if (!qrValue) {
      setResult(null);
      return;
    }

    try {
      const size = Number(options.size) || 200;
      const output = await generateQrCode({
        text: qrValue,
        format: 'svg',
        size,
        margin: Number(options.margin) || 0,
        darkColor: options.fgColor,
        lightColor: options.bgColor,
        transparentBackground: options.transparentBackground,
        errorCorrectionLevel: options.errorCorrectionLevel,
        moduleStyle: options.moduleStyle,
        logoDataUrl: options.logoDataUrl || undefined,
        logoSizePercent: Number(options.logoSizePercent) || 18,
        logoPadding: Number(options.logoPadding) || 0
      });
      setResult(
        options.outputFormat === 'svg'
          ? svgToFile(output.text)
          : await svgToPngFile(output.text, size)
      );
    } catch (error) {
      setResult(null);
      showSnackBar(
        error instanceof Error ? error.message : t('qrCode.failed'),
        'error'
      );
    }
  };
  useEffect(() => {
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runQrCode() {
        if (canceled) return;
        await compute(options);
      }

      void runQrCode();
    }, 500);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [options]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ImageOptionStack>
              {getGroups(options, updateField).map((group) => (
                <Box key={group.title}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {group.title}
                  </Typography>
                  {group.component}
                </Box>
              ))}
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult title={t('qrCode.resultOutput')} value={result} />
        }
      />
    </Box>
  );
}
