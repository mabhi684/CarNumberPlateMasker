import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
}

export const ImageUploader = ({ onImageUpload }: ImageUploaderProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false)
  });

  return (
    <div
      {...getRootProps()}
      style={{
        width: '100%',
        maxWidth: '800px',
        height: '400px',
        border: `2px dashed ${isDragReject ? '#dc2626' : isDragActive ? '#FF00FF' : '#d1d5db'}`,
        borderRadius: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: isDragActive ? 'rgba(255, 0, 255, 0.05)' : 'transparent',
        padding: '2rem'
      }}
    >
      <input {...getInputProps()} />
      <Upload style={{ 
        width: '3rem', 
        height: '3rem', 
        color: isDragReject ? '#dc2626' : isDragActive ? '#FF00FF' : '#666666' 
      }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ 
          fontSize: '1.25rem', 
          fontWeight: 500, 
          color: isDragReject ? '#dc2626' : isDragActive ? '#FF00FF' : '#333333',
          marginBottom: '0.5rem'
        }}>
          {isDragReject 
            ? 'Invalid file type' 
            : isDragActive 
              ? 'Drop the image here' 
              : 'Drag & drop an image here'}
        </p>
        <p style={{ 
          fontSize: '1rem', 
          color: '#666666' 
        }}>
          or click to select a file
        </p>
      </div>
    </div>
  );
}; 