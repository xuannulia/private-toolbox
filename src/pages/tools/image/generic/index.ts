import { tool as splitImage } from './split/meta';
import { tool as barcodeGenerator } from './barcode/meta';
import { tool as resizeImage } from './resize/meta';
import { tool as compressImage } from './compress/meta';
import { tool as changeColors } from './change-colors/meta';
import { tool as removeBackground } from './remove-background/meta';
import { tool as cropImage } from './crop/meta';
import { tool as changeOpacity } from './change-opacity/meta';
import { tool as createTransparent } from './create-transparent/meta';
import { tool as imageToBase64 } from './image-to-base64/meta';
import { tool as imageToIcon } from './image-to-icon/meta';
import { tool as imageInfo } from './image-info/meta';
import { tool as imageToText } from './image-to-text/meta';
import { tool as qrCodeDecode } from './qr-code-decode/meta';
import { tool as qrCodeGenerator } from './qr-code/meta';
import { tool as rotateImage } from './rotate/meta';
import { tool as imageEditor } from './editor/meta';

export const imageGenericTools = [
  imageEditor,
  resizeImage,
  compressImage,
  removeBackground,
  cropImage,
  changeOpacity,
  changeColors,
  createTransparent,
  imageInfo,
  imageToBase64,
  imageToIcon,
  imageToText,
  qrCodeGenerator,
  qrCodeDecode,
  barcodeGenerator,
  rotateImage,
  splitImage
];
