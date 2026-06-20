export type QRCodeType =
  | 'URL'
  | 'Text'
  | 'Email'
  | 'Phone'
  | 'SMS'
  | 'WiFi'
  | 'vCard';

export type WifiEncryptionType = 'WPA' | 'WEP' | 'None';
export type QrCodeOutputFormat = 'png' | 'svg';
export type QrCodeModuleStyle = 'square' | 'dots';
export type QrCodeErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface InitialValuesType {
  qrCodeType: QRCodeType;

  // Common settings
  size: string;
  margin: string;
  outputFormat: QrCodeOutputFormat;
  bgColor: string;
  fgColor: string;
  transparentBackground: boolean;
  errorCorrectionLevel: QrCodeErrorCorrectionLevel;
  moduleStyle: QrCodeModuleStyle;
  logoDataUrl: string;
  logoName: string;
  logoSizePercent: string;
  logoPadding: string;

  // URL
  url: string;

  // Text
  text: string;

  // Email
  emailAddress: string;
  emailSubject: string;
  emailBody: string;

  // Phone
  phoneNumber: string;

  // SMS
  smsNumber: string;
  smsMessage: string;

  // WiFi
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: WifiEncryptionType;

  // vCard
  vCardName: string;
  vCardEmail: string;
  vCardPhone: string;
  vCardAddress: string;
  vCardCompany: string;
  vCardTitle: string;
  vCardWebsite: string;
}
