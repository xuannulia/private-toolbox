import { Box } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import FilerobotImageEditor, {
  FilerobotImageEditorConfig
} from 'react-filerobot-image-editor';

export default function ImageEditor() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<File | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleInputChange = useCallback(
    (file: File | null) => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);

      setInput(file);
      if (file) {
        setImageUrl(URL.createObjectURL(file));
        setIsEditorOpen(true);
      } else {
        setImageUrl(null);
        setIsEditorOpen(false);
      }
    },
    [imageUrl]
  );

  const onCloseEditor = () => {
    setIsEditorOpen(false);
  };

  const handleSave: FilerobotImageEditorConfig['onSave'] = (
    editedImageObject
  ) => {
    if (!editedImageObject?.imageBase64) return;

    const base64Data = editedImageObject.imageBase64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: editedImageObject.mimeType });
    const editedFile = new File(
      [blob],
      editedImageObject.fullName ?? 'edited.png',
      {
        type: editedImageObject.mimeType
      }
    );
    const url = URL.createObjectURL(editedFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = editedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDefaultImageName = () => {
    if (!input) return undefined;

    return `${input.name.replace(/\.[^/.]+$/, '')}-edited`;
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          isEditorOpen && imageUrl ? (
            <Box sx={{ width: '100%', height: '70vh' }}>
              <FilerobotImageEditor
                source={imageUrl}
                onSave={handleSave}
                onClose={onCloseEditor}
                annotationsCommon={{
                  fill: 'blue'
                }}
                defaultSavedImageName={getDefaultImageName()}
                Rotate={{ angle: 90, componentType: 'slider' }}
                savingPixelRatio={1}
                previewPixelRatio={1}
              />
            </Box>
          ) : (
            <ToolImageInput
              value={input}
              onChange={handleInputChange}
              accept={['image/*']}
              title={t('editor.inputTitle')}
            />
          )
        }
      />
    </Box>
  );
}
