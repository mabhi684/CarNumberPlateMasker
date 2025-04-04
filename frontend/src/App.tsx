import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, X, Image as ImageIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [image, setImage] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImage(file);
      setProcessedImage(null);
      setError(null);
      setLoading(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        console.log('Sending request to backend...');
        const response = await fetch(`${API_URL}/upload/`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          throw new Error(`Failed to process image: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.message === 'Success' && data.image_url) {
          console.log('Setting processed image URL:', data.image_url);
          setProcessedImage(data.image_url);
        } else {
          console.error('Invalid response format:', data);
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        console.error('Error details:', err);
        setError('Failed to process image. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleDownload = async () => {
    if (!processedImage) return;
    
    try {
      const response = await fetch(`${API_URL}${processedImage}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `masked_${image?.name || 'image'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download image. Please try again.');
    }
  };

  const resetState = () => {
    setImage(null);
    setProcessedImage(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', image);

    try {
      const response = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const data = await response.json();
      if (data.message === 'Success' && data.image_url) {
        setProcessedImage(data.image_url);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      minHeight: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        minHeight: '100vh',
        width: '100%',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{ 
          width: '100%', 
          margin: '0 auto'
        }}>
          {!image && !processedImage ? (
            <div style={{ 
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div
                {...getRootProps()}
                style={{
                  border: '2px dashed #FF00FF',
                  borderRadius: '1rem',
                  padding: '4rem',
                  width: '100%',
                  maxWidth: '800px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  margin: '0 auto',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <input {...getInputProps()} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{
                    width: '6rem',
                    height: '6rem',
                    margin: '0 auto',
                    backgroundColor: '#FF00FF',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Upload style={{ width: '3rem', height: '3rem', color: '#ffffff' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '1.5rem', color: '#333333', fontWeight: 500 }}>
                      {isDragActive ? 'Drop the image here' : 'Drag & drop an image here'}
                    </p>
                    <p style={{ color: '#666666', fontSize: '1.125rem' }}>or click to select a file</p>
                  </div>
                  <p style={{ fontSize: '1rem', color: '#666666' }}>Supports: PNG, JPG, JPEG</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '2rem',
              width: '100%',
              margin: '0 auto'
            }}>
              {/* Original Image */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ImageIcon style={{ width: '1.5rem', height: '1.5rem', color: '#FF00FF' }} />
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: '#333333' }}>Original Image</h2>
                  </div>
                  <button
                    onClick={resetState}
                    style={{ color: '#666666', cursor: 'pointer', border: 'none', background: 'none' }}
                  >
                    <X style={{ width: '1.5rem', height: '1.5rem' }} />
                  </button>
                </div>
                <div style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#f3f4f6', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <img
                    src={image ? URL.createObjectURL(image) : ''}
                    alt="Original"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          onDrop([file]);
                        }
                      };
                      input.click();
                    }}
                    style={{ 
                      position: 'absolute',
                      bottom: '1.5rem',
                      right: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: '#FF00FF',
                      color: '#ffffff',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#FF33FF';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#FF00FF';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Upload style={{ width: '1.25rem', height: '1.25rem' }} />
                    <span style={{ fontWeight: 500 }}>Upload More</span>
                  </button>
                  {loading && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        border: '3px solid #ffffff',
                        borderTopColor: 'transparent',
                        borderRadius: '9999px',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Processed Image */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <ImageIcon style={{ width: '1.5rem', height: '1.5rem', color: '#FF00FF' }} />
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: '#333333' }}>Processed Image</h2>
                </div>
                <div style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#f3f4f6', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  {error ? (
                    <div style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      backgroundColor: '#fee2e2',
                      padding: '2rem'
                    }}>
                      {error}
                    </div>
                  ) : processedImage ? (
                    <>
                      <img
                        src={`${API_URL}${processedImage}`}
                        alt="Processed"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          cursor: 'pointer'
                        }}
                        onClick={() => setShowModal(true)}
                      />
                      <button
                        onClick={handleDownload}
                        style={{
                          position: 'absolute',
                          bottom: '1.5rem',
                          right: '1.5rem',
                          backgroundColor: '#FF00FF',
                          color: '#ffffff',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'all 0.2s',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          fontSize: '1rem'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF33FF';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF00FF';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Download style={{ width: '1.25rem', height: '1.25rem' }} />
                        <span style={{ fontWeight: 500 }}>Download</span>
                      </button>
                    </>
                  ) : (
                    <div style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666666',
                      border: '2px dashed #d1d5db',
                      fontSize: '1.125rem'
                    }}>
                      <p>Processing image...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showModal && processedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`${API_URL}${processedImage}`}
              alt="Processed Full Size"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '0.5rem'
              }}
            />
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '-2.5rem',
                right: '-2.5rem',
                backgroundColor: '#ffffff',
                color: '#FF00FF',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #FF00FF',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s',
                zIndex: 1001
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#FF00FF';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#FF00FF';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#FF00FF';
                e.currentTarget.style.borderColor = '#FF00FF';
              }}
            >
              <X style={{ width: '1.5rem', height: '1.5rem' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
