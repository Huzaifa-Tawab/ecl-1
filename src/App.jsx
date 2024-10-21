import React, { useState } from "react";
import * as XLSX from "xlsx";
import './App.css';

function App() {
  const [excelData, setExcelData] = useState(null);
  const [calculatedMigrationData, setCalculatedMigrationData] = useState(null);
  const [calculatedAverageData, setCalculatedAverageData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [segment1, setSegment1] = useState("");
  const [segment2, setSegment2] = useState("");
  const [lossRateSegment1, setLossRateSegment1] = useState("");
  const [lossRateSegment2, setLossRateSegment2] = useState("");
  const [calculatedLossRates, setCalculatedLossRates] = useState(null);
  const bucketOptions = [
    "Not Due", "1-29", "30-59", "60-89", "90-119", "120-149", "150-179", "180-209", "210-239", "240-269",
    "270-299", "300-329", "330-359", "360-389", "390-419", "420-449", "450-479", "480-509", "510-539",
    "540-569", "570-599", "600-629", "630-659", "660-689", "690-719", "720-749", "750-779", "Total"
  ];

  // Function to handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const options = {
          header: 1,
          range: 1,
        };

        const rawData = XLSX.utils.sheet_to_json(sheet, options);

        const headers = rawData[0];

        const nonHeaders = ["Date", "Segment", "Total"];
        const newHeader = headers.filter((item) => !nonHeaders.includes(item));

        const data = rawData
          .slice(1)
          .filter((row) => row.length > 0);

        setExcelData({ headers, data });

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

            if (previousValue === 0) {
              return previousRowValue;
            }

            const migrationValue = currentValue / previousValue;

            return migrationValue > 1 ? 1 : migrationValue.toFixed(5);
          });
      });

    setCalculatedMigrationData(resultData);
    calculateAveragePerSegment(resultData);
  };

  function calculateAveragePerSegment(data) {
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
  }

  function splitBySegments(data) {
    const segmentGroups = {};

    data.forEach(row => {
      const segmentName = row[0];
      const values = row.slice(1);

      if (!segmentGroups[segmentName]) {
        segmentGroups[segmentName] = [];
      }

      segmentGroups[segmentName].push(values);
    });

    return segmentGroups;
  }

  const handleSegment1Change = (e) => {
    setSegment1(e.target.value);
    setSegment2("");
  };

  const handleSegment2Change = (e) => {
    setSegment2(e.target.value);
  };

  // Submit button handler to filter data based on selected segments
  const handleSubmit = () => {
    if (segment1 && segment2 && calculatedAverageData) {
      const segment1Index = bucketOptions.indexOf(segment1);
      const segment2Index = bucketOptions.indexOf(segment2);

      // Filter and store data for the selected bucket ranges
      const filtered = Object.entries(calculatedAverageData).map(([key, row]) => {
        let segment1Values = [];
        let segment2Values = [];

        // Get the values up to the selected segment index for both Segment 1 and Segment 2
        if (key === "Segment 1") {
          segment1Values = row.slice(0, segment1Index + 1);
          segment2Values = new Array(segment1Values.length).fill(""); // Empty for Segment 2 in this row
        } else if (key === "Segment 2") {
          segment2Values = row.slice(0, segment2Index + 1);
          segment1Values = new Array(segment2Values.length).fill(""); // Empty for Segment 1 in this row
        }

        return [key, segment1Values, segment2Values];
      });

      setFilteredData(filtered);
    }
  };
  const handleCalculateLossRate = () => {
    if (lossRateSegment1 && lossRateSegment2 && filteredData) {
        // Convert loss rate percentages to decimal values
        const segment1LossRate = parseFloat(lossRateSegment1) / 100 || 0;
        const segment2LossRate = parseFloat(lossRateSegment2) / 100 || 0;

        // Function to calculate the multiplied result for a segment
        const calculateRate = (segmentValues, percentage) => {
            // Initialize the result array
            let results = [];

            // Iterate through each bucket to calculate the results
            for (let i = 0; i < segmentValues.length; i++) {
                // Calculate the product of all buckets starting from index i
                let product = 1;
                for (let j = i; j < segmentValues.length; j++) {
                    const val = parseFloat(segmentValues[j]) / 100 || 0; // Convert to decimal
                    product *= val; // Multiply all bucket values together starting from index i
                }

                // Multiply the product by the percentage and convert to a percentage format
                const calculatedValue = (product * percentage * 100).toFixed(2);
                results.push(`${calculatedValue}`); // Format the value as a percentage
            }

            return results;
        };

        // Calculate the multiplied values for segment 1 and segment 2
        const segment1Values = filteredData[0][1] || []; // Assuming index 0 contains segment 1 data
        const segment2Values = filteredData[1][2] || []; // Assuming index 1 contains segment 2 data

        // Calculate loss rates for segment 1 and segment 2
        const segment1Results = calculateRate(segment1Values, segment1LossRate); // Calculate for segment 1
        const segment2Results = calculateRate(segment2Values, segment2LossRate); // Calculate for segment 2

        // Store the results as arrays for display
        setCalculatedLossRates([segment1Results, segment2Results]);

        // Optional: Log results to console for verification
        console.log("Segment 1 Results:", segment1Results);
        console.log("Segment 2 Results:", segment2Results);
    } else {
        console.error("Loss rates or filtered data not defined.");
    }
};



  
  

  

  


  const downloadExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      excelData.headers,
      ...calculatedMigrationData,
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MigrationData");
    XLSX.writeFile(workbook, "MigrationData.xlsx");
  };

  return (
    <div className="container">
      <h1>Excel Migration Calculator</h1>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />

      {calculatedMigrationData && (
        <>
          <div className="migration-data">
            <h3>Calculated Migration Data</h3>
            <table>
              <thead>
                <tr>
                  <th>Segment</th>
                  {bucketOptions.map((bucket, index) => (
                    <th key={index}>{bucket}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calculatedMigrationData.map((row, index) => (
                  <tr key={index}>
                    {row.map((value, i) => (
                      <td key={i}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="average-data">
            <h3>Calculated Average Migration</h3>
            <table>
              <thead>
                <tr>
                  <th>Segment</th>
                  {bucketOptions.map((bucket, index) => (
                    <th key={index}>{bucket}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(calculatedAverageData).map(([key, row], index) => (
                  <tr key={index}>
                    <td>{key}</td>
                    {row.map((value, i) => (
                      <td key={i}>{value}%</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="comparison-section">
            <h3>Compare Average Migration</h3>
            <div>
              <label>Select Segment 1: </label>
              <select value={segment1} onChange={handleSegment1Change}>
                <option value="">Select Segment 1</option>
                {bucketOptions.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {segment1 && (
              <div>
                <label>Select Segment 2: </label>
                <select value={segment2} onChange={handleSegment2Change}>
                  <option value="">Select Segment 2</option>
                  {bucketOptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={handleSubmit}>Submit</button>
          </div>

          {filteredData && (
            <div className="filtered-results">
              <h4>Filtered Calculated Average for Selected Buckets</h4>
              <table>
                <thead>
                  <tr>
                    <th>Segment</th>
                    {bucketOptions.map((bucket, index) => (
                      <th key={index}>{bucket}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={index}>
                      <td>{row[0]}</td>
                      {bucketOptions.map((_, i) => (
                        <td key={i}>
                          {/* Display Segment 1 and Segment 2 values together, separated by a slash */}
                          {row[1][i] !== undefined ? row[1][i] : ""}
                          {row[2][i] !== undefined ? `${row[2][i]}%` : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>

              </table>
              <div className="loss-rate-inputs">
                <div className="input-wrapper">
                  <label>Loss Rate of Segment 1 %:</label>
                  <input value={lossRateSegment1} onChange={(e) => setLossRateSegment1(e.target.value)} />
                </div>
                <div className="input-wrapper">
                  <label>Loss Rate of Segment 2 %:</label>
                  <input value={lossRateSegment2} onChange={(e) => setLossRateSegment2(e.target.value)} />
                </div>
                <button onClick={handleCalculateLossRate}>Calculate Loss Rates</button>
              </div>
              
              {calculatedLossRates && (
                <div className="loss-rates">
                  <h4>Calculated Loss Rates</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Segment</th>
                        {bucketOptions.map((bucket, index) => (
                          <th key={index}>{bucket}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Segment 1</td>
                        {calculatedLossRates[0] && calculatedLossRates[0].map((rate, index) => (
          <td key={index}>{rate}%</td>
        ))}
                      </tr>
                      <tr>
                        <td>Segment 2</td>
                        {calculatedLossRates[1] && calculatedLossRates[1].map((rate, index) => (
          <td key={index}>{rate}%</td>
        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

           
            </div>
          )}
          
          <button onClick={downloadExcel}>Download Excel</button>
        </>
      )}
    </div>
  );
}

export default App;
