// AgingDataProcessor.js
import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const AgingDataProcessor = ({ onDataProcessed, segments, setSegments }) => {
  const [aggingExcelData, setAggingExcelData] = useState(null);
  const [calculatedMigrationData, setCalculatedMigrationData] = useState(null);
  const [calculatedAverageData, setCalculatedAverageData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [bucketOptions, setBucketOptions] = useState([]);
  const [selectedSegments, setSelectedSegments] = useState({});
  const [lossRates, setLossRates] = useState({});
  const [calculatedLossRates, setCalculatedLossRates] = useState(null);
  const [isAggingFileUploaded, setIsAggingFileUploaded] = useState(false);

  const downloadAgingTemplate = () => {
    const template = {
      'Date': ['2024-01', '2024-02'],
      'Segment': ['Segment1', 'Segment2'],
      'Bucket1': [100, 100],
      'Bucket2': [90, 90],
      'Bucket3': [80, 80]
    };
    
    const ws = XLSX.utils.json_to_sheet(
      Object.keys(template).map((_, i) => 
        Object.fromEntries(Object.entries(template).map(([k, v]) => [k, v[i]]))
      )
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aging Data");
    XLSX.writeFile(wb, "aging_template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      setIsAggingFileUploaded(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const options = {
          header: 1,
          range: 1,
        };

        const rawData = XLSX.utils.sheet_to_json(sheet, options);
        const headers = rawData[0];
        
        const nonHeaders = ["Date", "Segment", "Total"];
        const buckets = headers.filter(item => !nonHeaders.includes(item));
        setBucketOptions(buckets);

        const uniqueSegments = [...new Set(rawData.slice(1).map(row => row[1]).filter(Boolean))];
        setSegments(uniqueSegments);

        const data = rawData.slice(1).filter(row => row.length > 0);
        setAggingExcelData({ headers, data });
        calculateMigration(data, headers);
      };

      reader.readAsBinaryString(file);
    }
  };

  const calculateMigration = (data, headers) => {
    const resultData = data
      .filter((_, rowIndex) => rowIndex !== 0)
      .map((row, rowIndex) => {
        return row
          .filter((_, colIndex) => colIndex > 1)
          .map((cellValue, colIndex) => {
            const adjustedColIndex = colIndex + 3;
            const previousRowValue = data[rowIndex][adjustedColIndex - 2];
            const currentValue = parseFloat(cellValue) || 0;
            const previousValue = parseFloat(previousRowValue) || 0;

            if (previousValue === 0) return previousRowValue;

            const migrationValue = currentValue / previousValue;
            return migrationValue > 1 ? 1 : migrationValue.toFixed(5);
          });
      });

    setCalculatedMigrationData(resultData);
    calculateAveragePerSegment(resultData);
  };

  const calculateAveragePerSegment = (data) => {
    const newData = splitBySegments(data);
    const averages = {};

    for (const segment in newData) {
      const segmentData = newData[segment];
      const columnCount = segmentData[0].length;
      const sums = Array(columnCount).fill(0);
      const rowCount = segmentData.length;

      segmentData.forEach(row => {
        row.forEach((value, index) => {
          sums[index] += parseFloat(value);
        });
      });

      const averagesForSegment = sums.map(sum => ((sum / rowCount) * 100).toFixed(2));
      averages[segment] = averagesForSegment;
    }

    setCalculatedAverageData(averages);
  };

  const splitBySegments = (data) => {
    const segmentGroups = {};

    data.forEach(row => {
      const segmentName = row[0]?.trim();
      const values = row.slice(1);

      if (!segmentName) return;

      if (!segmentGroups[segmentName]) {
        segmentGroups[segmentName] = [];
      }

      segmentGroups[segmentName].push(values);
    });

    return segmentGroups;
  };

  const handlebucSubmit = () => {
    if (Object.keys(selectedSegments).length > 0 && calculatedAverageData) {
      const filtered = Object.entries(calculatedAverageData)
        .filter(([segment]) => selectedSegments[segment])
        .map(([segment, row]) => {
          const segmentBucket = selectedSegments[segment];
          const bucketIndex = bucketOptions.indexOf(segmentBucket);

          if (bucketIndex === -1) return null;

          const values = row.slice(0, bucketIndex + 1);
          return [segment, values];
        })
        .filter(Boolean);

      setFilteredData(filtered);
      onDataProcessed(filtered, bucketOptions, calculatedLossRates, segments, );
    }
  };

  const handleCalculateLossRate = () => {
    if (Object.keys(lossRates).length > 0 && filteredData) {
      const results = {};

      filteredData.forEach(([segment, values]) => {
        const lossRate = parseFloat(lossRates[segment]) / 100 || 0;
        const calculatedRates = calculateRate(values, lossRate);
        results[segment] = calculatedRates;
      });

      setCalculatedLossRates(results);
    }
  };

  const calculateRate = (segmentValues, percentage) => {
    let results = [];

    for (let i = 0; i < segmentValues.length; i++) {
      let product = 1;
      for (let j = i; j < segmentValues.length; j++) {
        const val = parseFloat(segmentValues[j]) / 100 || 0;
        product *= val;
      }

      const calculatedValue = (product * percentage * 100).toFixed(2);
      results.push(calculatedValue);
    }

    return results;
  };

  const handleSegmentSelection = (segmentId, value) => {
    setSelectedSegments(prev => ({
      ...prev,
      [segmentId]: value
    }));
  };

  const handleLossRateChange = (segmentId, value) => {
    setLossRates(prev => ({
      ...prev,
      [segmentId]: value
    }));
  };

  return (
    <div className="aging-data-section">
      <h2 className="text-xl font-bold mb-4">Aging Data Processing</h2>
      
      <button onClick={downloadAgingTemplate} className="ecl-button mb-4">
        Download Aging Template
      </button>
      
      <div className="upload-section mb-6">
        <label htmlFor="aging" className="block mb-2">Aging Data File</label>
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileUpload}
          className="block w-full text-sm border rounded-lg cursor-pointer" 
        />
        {isAggingFileUploaded && <span className="text-green-500 text-sm">✓ File uploaded</span>}
      </div>

      {calculatedAverageData && (
        <div className="comparison-section mb-6">
          <h3 className="text-lg font-bold mb-4">Compare Average Migration</h3>
          {segments.map((segment) => (
            <div key={segment} className="segment-selection mb-4">
              <label className="block mb-2">Select Bucket for {segment}: </label>
              <select 
                value={selectedSegments[segment] || ""} 
                onChange={(e) => handleSegmentSelection(segment, e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Bucket</option>
                {bucketOptions.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
            </div>
          ))}

          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            onClick={handlebucSubmit}
          >
            Submit
          </button>
        </div>
      )}

      {filteredData && (
        <div className="filtered-results">
          <h4 className="text-lg font-bold mb-4">Filtered Calculated Average for Selected Buckets</h4>
          <table className="min-w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Segment</th>
                {bucketOptions.map((bucket, index) => (
                  <th key={index} className="border p-2">{bucket}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map(([segment, values], index) => (
                <tr key={index}>
                  <td className="border p-2">{segment}</td>
                  {bucketOptions.map((_, i) => (
                    <td key={i} className="border p-2">
                      {values[i] ? `${values[i]}%` : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="loss-rate-inputs grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {segments.map((segment) => (
              <div key={segment} className="segment-input">
                <label htmlFor={`lossRate-${segment}`} className="block mb-2">{segment} Loss Rate (%)</label>
                <input
                  type="number"
                  id={`lossRate-${segment}`}
                  value={lossRates[segment] || ""}
                  onChange={(e) => handleLossRateChange(segment, e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
            ))}
          </div>

          <button 
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            onClick={handleCalculateLossRate}
          >
            Calculate Loss Rates
          </button>

          {calculatedLossRates && (
            <div className="loss-rates mt-6">
              <h4 className="text-lg font-bold mb-4">Calculated Loss Rates</h4>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Segment</th>
                    {bucketOptions.map((bucket, index) => (
                      <th key={index} className="border p-2">{bucket}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(calculatedLossRates).map(([segment, rates], index) => (
                    <tr key={index}>
                      <td className="border p-2">{segment}</td>
                      {rates.map((rate, i) => (
                        <td key={i} className="border p-2">{rate}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgingDataProcessor;