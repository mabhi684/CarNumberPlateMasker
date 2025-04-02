import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Button } from "./ui/button.tsx";
import { UploadCloud, Loader2, Download } from "lucide-react";

const FileUpload: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await axios.post<{ image_url: string }>(
        "http://127.0.0.1:8000/upload/",
        formData
      );
      setProcessedImage(res.data.image_url);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-5">
      {/* Header stays fixed */}
      <motion.h1
        className="text-4xl font-bold mb-6 text-primary"
        animate={{ opacity: 1, scale: 1 }}
        initial={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5 }}
      >
        AI-Powered Car Number Plate Masker
      </motion.h1>

      {/* Upload Box */}
      <motion.label whileHover={{ scale: 1.05 }} className="cursor-pointer mb-6">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button className="bg-primary text-white flex items-center space-x-2 p-3 hover:shadow-lg">
          <UploadCloud className="w-5 h-5" />
          <span>Upload Image</span>
        </Button>
      </motion.label>

      {/* Image Container with Reserved Space */}
      <div className="w-full max-w-4xl min-h-[400px] flex flex-col items-center">
        {image && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Original Image */}
            <div className="p-3 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center">
              <h2 className="text-lg font-semibold mb-2">Original</h2>
              <img
                src={image}
                alt="Uploaded"
                className="max-w-full max-h-64 object-contain rounded-lg shadow-md"
              />
            </div>

            {/* Processed Image */}
            {loading ? (
              <div className="w-full flex items-center justify-center bg-gray-700 rounded-lg h-64">
                <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
              </div>
            ) : (
              processedImage && (
                <motion.div
                  className="p-3 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center"
                  animate={{ opacity: 1, x: 0 }}
                  initial={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-lg font-semibold mb-2">Processed</h2>
                  <img
                    src={`http://127.0.0.1:8000${processedImage}`}
                    alt="Processed"
                    className="max-w-full max-h-64 object-contain rounded-lg shadow-md"
                  />

                  {/* Download Button */}
                  <Button
                    className="mt-2 bg-primary text-white flex items-center space-x-2 p-2"
                    onClick={() =>
                      window.open(`http://127.0.0.1:8000${processedImage}`, "_blank")
                    }
                  >
                    <Download className="w-5 h-5" />
                    <span>Download</span>
                  </Button>
                </motion.div>
              )
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
