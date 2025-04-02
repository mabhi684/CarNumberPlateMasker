import { useEffect, useState } from "react";
import axios from "axios";

interface ProcessedImage {
  filename: string;
}

const HistoryGrid: React.FC = () => {
  const [history, setHistory] = useState<ProcessedImage[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get<ProcessedImage[]>(
          "http://127.0.0.1:8000/history"
        );
        setHistory(res.data);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="p-5">
      <h2 className="text-xl font-bold mb-4">Recently Processed</h2>
      <div className="grid grid-cols-3 gap-4">
        {history.map((item, index) => (
          <img
            key={index}
            src={`http://127.0.0.1:8000/static/output/${item.filename}`}
            className="w-32 h-24 rounded-lg shadow-lg"
            alt="History"
          />
        ))}
      </div>
    </div>
  );
};

export default HistoryGrid;
