// import React, { useMemo, useState } from "react";
// import * as XLSX from "xlsx";
// import { abs, mean, std } from 'mathjs';
// import './ecl.css';

// function EclCalculator() {
//   const [aggingexcelData, setAggingExcelData] = useState(null);
//   const [calculatedMigrationData, setCalculatedMigrationData] = useState(null);
//   const [calculatedAverageData, setCalculatedAverageData] = useState(null);
//   const [filteredData, setFilteredData] = useState(null);
//   const [segments, setSegments] = useState([]); // Store available segments
//   const [bucketOptions, setBucketOptions] = useState([]); // Store bucket options
//   const [selectedSegments, setSelectedSegments] = useState({}); // Store selected segments and their buckets
//   const [lossRates, setLossRates] = useState({}); // Store loss rates for each segment
//   const [calculatedLossRates, setCalculatedLossRates] = useState(null);
//   const [excelData, setExcelData] = useState({ data: {}, metrics: {} });
//   const [directions, setDirections] = useState({});
//   const [normalizedDirections, setNormalizedDirections] = useState({});
//   const [adjustedMetrics, setAdjustedMetrics] = useState({});
//   const [submitted, setSubmitted] = useState(false);
//   const [step, setStep] = useState(1); // Track current step
//   const [finalNormalizedValues, setFinalNormalizedValues] = useState({});
//   const [isAggingFileUploaded, setIsAggingFileUploaded] = useState(false);
//   const [isMacroFileUploaded, setIsMacroFileUploaded] = useState(false);
//   const [showResults, setShowResults] = useState(false);

//   // Function to handle file upload
//   const handleFileUpload = (e) => {
//     const file = e.target.files[0];

//     if (file) {
//       setIsAggingFileUploaded(true);
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         // ... (keep existing file processing logic)
//         const binaryStr = event.target.result;
//         const workbook = XLSX.read(binaryStr, { type: "binary" });
//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];

//         const options = {
//           header: 1,
//           range: 1,
//         };

//         const rawData = XLSX.utils.sheet_to_json(sheet, options);
//         const headers = rawData[0];
        
//         const nonHeaders = ["Date", "Segment", "Total"];
//         const buckets = headers.filter(item => !nonHeaders.includes(item));
//         setBucketOptions(buckets);

//         const uniqueSegments = [...new Set(rawData.slice(1).map(row => row[1]).filter(Boolean))];
//         setSegments(uniqueSegments);

//         const data = rawData.slice(1).filter(row => row.length > 0);
//         setAggingExcelData({ headers, data });
//         calculateMigration(data, headers);
//       };

//       reader.readAsBinaryString(file);
//     }
//   };

//   const handleMacroUpload = (e) => {
//     const file = e.target.files[0];

//     if (file) {
//       setIsMacroFileUploaded(true);
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         const binaryStr = event.target.result;
//         const workbook = XLSX.read(binaryStr, { type: 'binary' });

//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];

//         const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//         const formattedData = data.reduce((acc, row) => {
//           const [status, year, ...values] = row;
//           values.forEach((value, index) => {
//             const header = data[0][index + 2];
//             if (!acc[header]) {
//               acc[header] = [];
//             }
//             acc[header].push({
//               status,
//               year,
//               value,
//             });
//           });
//           return acc;
//         }, {});

//         const metrics = Object.entries(formattedData).reduce((acc, [header, data]) => {
//           const actualData = data.filter((item) => item.status === 'Actual');
//           const actualValues = actualData.map((item) => item.value);
//           const last5Years = actualData.slice(-5).map((item) => item.value);

//           const forecastedData = data.filter((item) => item.status === 'Forecasted');
//           const forecastedValues = forecastedData.map((item) => item.value);

//           const adjustedForecastedValues = forecastedValues.map((value) => {
//             const base = value;
//             const bestCase = base + std(last5Years);
//             const worstCase = base - std(last5Years);

//             return {
//               base,
//               bestCase,
//               worstCase,
//               normalizedBase: abs(base - mean(actualValues)) / std(actualValues),
//               normalizedBestCase: abs(bestCase - mean(actualValues)) / std(actualValues),
//               normalizedWorstCase: abs(worstCase - mean(actualValues)) / std(actualValues),
//             };
//           });

//           const normalizedAverages = adjustedForecastedValues.reduce(
//             (avgAcc, { normalizedBase, normalizedBestCase, normalizedWorstCase }) => {
//               avgAcc.totalBase += normalizedBase;
//               avgAcc.totalBest += normalizedBestCase;
//               avgAcc.totalWorst += normalizedWorstCase;
//               avgAcc.count += 1;
//               return avgAcc;
//             },
//             { totalBase: 0, totalBest: 0, totalWorst: 0, count: 0 }
//           );

//           acc[header] = {
//             standardDeviation_last5: std(last5Years),
//             normalizedAverageBase: normalizedAverages.totalBase / normalizedAverages.count,
//             normalizedAverageBest: normalizedAverages.totalBest / normalizedAverages.count,
//             normalizedAverageWorst: normalizedAverages.totalWorst / normalizedAverages.count,
//           };

//           return acc;
//         }, {});

//         const initialDirections = Object.keys(metrics).reduce((acc, header) => {
//           acc[header] = 'Positive';
//           return acc;
//         }, {});

//         setExcelData({ data: formattedData, metrics });
//         setDirections(initialDirections);
//         setNormalizedDirections(initialDirections);
//         setAdjustedMetrics(metrics);
//       };
//       reader.readAsBinaryString(file);
//     }
//   };

//   const handleDirectionChange = (header, value) => {
//     setDirections((prev) => ({
//       ...prev,
//       [header]: value,
//     }));
//     setAdjustedMetrics((prev) => {
//       const originalMetric = excelData.metrics[header];
//       const adjustedMetric = {
//         ...originalMetric,
//         standardDeviation_last5:
//           value === 'Positive'
//             ? Math.abs(originalMetric.standardDeviation_last5)
//             : -Math.abs(originalMetric.standardDeviation_last5),
//       };
//       return {
//         ...prev,
//         [header]: adjustedMetric,
//       };
//     });
//   };

//   const handleNormalizedDirectionChange = (header, value) => {
//     setNormalizedDirections(prev => ({
//       ...prev,
//       [header]: value
//     }));
//   };

//   const handleStepOneSubmit = () => {
//     setStep(2);
//   };

//   const handleFinalSubmit = () => {
//     // Calculate final normalized values with applied directions
//     const finalValues = Object.entries(adjustedMetrics).reduce((acc, [header, metric]) => {
//       acc[header] = {
//         normalizedAverageBase: normalizedDirections[header] === 'Positive' ? 
//           metric.normalizedAverageBase : abs(-metric.normalizedAverageBase),
//         normalizedAverageBest: normalizedDirections[header] === 'Positive' ? 
//           metric.normalizedAverageBest : abs(-metric.normalizedAverageBest),
//         normalizedAverageWorst: normalizedDirections[header] === 'Positive' ? 
//           metric.normalizedAverageWorst : abs(-metric.normalizedAverageWorst),
//         appliedDirection: normalizedDirections[header]
//       };
//       return acc;
//     }, {});

//     setFinalNormalizedValues(finalValues);
//     setSubmitted(true);
//     console.log('Final Normalized Values:', finalValues);
//     alert('Normalized values stored successfully!');
//   };

//   const { metrics } = useMemo(() => excelData, [excelData]);

//   const calculateMigration = (data, headers) => {
//     const resultData = data
//       .filter((_, rowIndex) => rowIndex !== 0)
//       .map((row, rowIndex) => {
//         return row
//           .filter((_, colIndex) => colIndex > 1)
//           .map((cellValue, colIndex) => {
//             const adjustedColIndex = colIndex + 3;
//             const previousRowValue = data[rowIndex][adjustedColIndex - 2];
//             const currentValue = parseFloat(cellValue) || 0;
//             const previousValue = parseFloat(previousRowValue) || 0;

//             if (previousValue === 0) return previousRowValue;

//             const migrationValue = currentValue / previousValue;
//             return migrationValue > 1 ? 1 : migrationValue.toFixed(5);
//           });
//       });

//     setCalculatedMigrationData(resultData);
//     calculateAveragePerSegment(resultData);
//   };

//   function calculateAveragePerSegment(data) {
//     const newData = splitBySegments(data);
//     const averages = {};

//     for (const segment in newData) {
//       const segmentData = newData[segment];
//       const columnCount = segmentData[0].length;
//       const sums = Array(columnCount).fill(0);
//       const rowCount = segmentData.length;

//       segmentData.forEach(row => {
//         row.forEach((value, index) => {
//           sums[index] += parseFloat(value);
//         });
//       });

//       const averagesForSegment = sums.map(sum => ((sum / rowCount) * 100).toFixed(2));
//       averages[segment] = averagesForSegment;
//     }

//     setCalculatedAverageData(averages);
//   }

//   function splitBySegments(data) {
//     const segmentGroups = {};

//     data.forEach(row => {
//       const segmentName = row[0]?.trim();
//       const values = row.slice(1);

//       if (!segmentName) return;

//       if (!segmentGroups[segmentName]) {
//         segmentGroups[segmentName] = [];
//       }

//       segmentGroups[segmentName].push(values);
//     });

//     return segmentGroups;
//   }

//   const handleSegmentSelection = (segmentId, value) => {
//     setSelectedSegments(prev => ({
//       ...prev,
//       [segmentId]: value
//     }));
//   };

//   const handleLossRateChange = (segmentId, value) => {
//     setLossRates(prev => ({
//       ...prev,
//       [segmentId]: value
//     }));
//   };

//   const handleSubmit = () => {
//     if (Object.keys(selectedSegments).length > 0 && calculatedAverageData) {
//       const filtered = Object.entries(calculatedAverageData).map(([key, row]) => {
//         const segmentBucket = selectedSegments[key];
//         const bucketIndex = bucketOptions.indexOf(segmentBucket);
//         const values = row.slice(0, bucketIndex + 1);
        
//         return [key, values];
//       });

//       setFilteredData(filtered);
//     }
//   };

//   const handleCalculateLossRate = () => {
//     if (Object.keys(lossRates).length > 0 && filteredData) {
//       const results = {};

//       filteredData.forEach(([segment, values]) => {
//         const lossRate = parseFloat(lossRates[segment]) / 100 || 0;
//         const calculatedRates = calculateRate(values, lossRate);
//         results[segment] = calculatedRates;
//       });

//       setCalculatedLossRates(results);
//     }
//   };

//   const calculateRate = (segmentValues, percentage) => {
//     let results = [];

//     for (let i = 0; i < segmentValues.length; i++) {
//       let product = 1;
//       for (let j = i; j < segmentValues.length; j++) {
//         const val = parseFloat(segmentValues[j]) / 100 || 0;
//         product *= val;
//       }

//       const calculatedValue = (product * percentage * 100).toFixed(2);
//       results.push(calculatedValue);
//     }

//     return results;
//   };

//   return (
//     <div className="container">
//      <h1>Excel Migration Calculator</h1>
      
//       <div className="upload-section space-y-4">
//         <div>
//           <label htmlFor="aging" className="block mb-2">Aging Data File </label>
//           <input 
//             type="file" 
//             accept=".xlsx, .xls" 
//             name="aging" 
//             onChange={handleFileUpload}
//             className="block w-full text-sm border rounded-lg cursor-pointer" 
//           />
//           {isAggingFileUploaded && <span className="text-green-500 text-sm">✓ File uploaded</span>}
//         </div>

//         <div>
//           <label htmlFor="macro" className="block mb-2">Macro Economics File </label>
//           <input 
//             type="file" 
//             accept=".xlsx, .xls" 
//             name="macro" 
//             onChange={handleMacroUpload}
//             className="block w-full text-sm border rounded-lg cursor-pointer" 
//           />
//           {isMacroFileUploaded && <span className="text-green-500 text-sm">✓ File uploaded</span>}
//         </div>

//         {isAggingFileUploaded && isMacroFileUploaded && !showResults && (
//           <button 
//             onClick={() => setShowResults(true)}
//             className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
//           >
//             Show Results
//           </button>
//         )}
//       </div>

      
      
      
//       {showResults && calculatedMigrationData && (
//         <>
//           {/* <div className="migration-data">
//             <h3>Calculated Migration Data</h3>
//             <table>
//               <thead>
//                 <tr>
//                   <th>Segment</th>
//                   {bucketOptions.map((bucket, index) => (
//                     <th key={index}>{bucket}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {calculatedMigrationData.map((row, index) => (
//                   <tr key={index}>
//                     {row.map((value, i) => (
//                       <td key={i}>{value}</td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div> */}

//           {/* <div className="average-data">
//             <h3>Calculated Average Migration</h3>
//             <table>
//               <thead>
//                 <tr>
//                   <th>Segment</th>
//                   {bucketOptions.map((bucket, index) => (
//                     <th key={index}>{bucket}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {Object.entries(calculatedAverageData).map(([key, row], index) => (
//                   <tr key={index}>
//                     <td>{key}</td>
//                     {row.map((value, i) => (
//                       <td key={i}>{value}%</td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div> */}

//           <div className="comparison-section">
//             <h3>Compare Average Migration</h3>
//             {segments.map((segment) => (
//               <div key={segment} className="segment-selection">
//                 <label>Select Bucket for {segment}: </label>
//                 <select 
//                   value={selectedSegments[segment] || ""} 
//                   onChange={(e) => handleSegmentSelection(segment, e.target.value)}
//                 >
//                   <option value="">Select Bucket</option>
//                   {bucketOptions.map((option, index) => (
//                     <option key={index} value={option}>
//                       {option}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             ))}

//             <button className="button-cal" onClick={handleSubmit}>Submit</button>
//           </div>

//           {filteredData && (
//             <div className="filtered-results">
//               <h4>Filtered Calculated Average for Selected Buckets</h4>
//               <table>
//                 <thead>
//                   <tr>
//                     <th>Segment</th>
//                     {bucketOptions.map((bucket, index) => (
//                       <th key={index}>{bucket}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredData.map(([segment, values], index) => (
//                     <tr key={index}>
//                       <td>{segment}</td>
//                       {bucketOptions.map((_, i) => (
//                         <td key={i}>
//                           {values[i] ? `${values[i]}%` : ""}
//                         </td>
//                       ))}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>

//               <div className="loss-rate-inputs">
//                 {segments.map((segment) => (
//                   <div key={segment} className="input-wrapper">
//                     <label>Loss Rate of {segment} %:</label>
//                     <input
//                       value={lossRates[segment] || ""}
//                       onChange={(e) => handleLossRateChange(segment, e.target.value)}
//                     />
//                   </div>
//                 ))}
//                 <button className="button-cal" onClick={handleCalculateLossRate}>
//                   Calculate Loss Rates
//                 </button>
//               </div>

//               {calculatedLossRates && (
//                 <div className="loss-rates">
//                   <h4>Calculated Loss Rates</h4>
//                   <table>
//                     <thead>
//                       <tr>
//                         <th>Segment</th>
//                         {bucketOptions.map((bucket, index) => (
//                           <th key={index}>{bucket}</th>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {Object.entries(calculatedLossRates).map(([segment, rates], index) => (
//                         <tr key={index}>
//                           <td>{segment}</td>
//                           {rates.map((rate, i) => (
//                             <td key={i}>{rate}%</td>
//                           ))}
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               )}
//             </div>
//           )}
//         </>
//       )}

// {showResults && Object.keys(metrics).length > 0 && (
//         <div>
//           {step === 1 && !submitted && (
//             <>
//               <h2 className="text-xl font-bold mb-4">Step 1: Set Standard Deviation Directions</h2>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full border-collapse border">
//                   <thead>
//                     <tr className="bg-gray-100">
//                       <th className="border p-2">Header</th>
//                       <th className="border p-2">Standard Deviation (Last 5 Years)</th>
//                       <th className="border p-2">Direction</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {Object.entries(adjustedMetrics).map(([header, metric]) => (
//                       <tr key={header} className="hover:bg-gray-50">
//                         <td className="border p-2">{header}</td>
//                         <td className="border p-2">{metric.standardDeviation_last5.toFixed(2)}</td>
//                         <td className="border p-2">
//                           <select
//                             value={directions[header]}
//                             onChange={(e) => handleDirectionChange(header, e.target.value)}
//                             className="w-full p-1 border rounded"
//                           >
//                             <option value="Positive">Positive</option>
//                             <option value="Negative">Negative</option>
//                           </select>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//               <button 
//                 onClick={handleStepOneSubmit} 
//                 className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//               >
//                 Next Step
//               </button>
//             </>
//           )}

//           {step === 2 && !submitted && (
//             <>
//               <h2 className="text-xl font-bold mb-4">Set Normalized Average Directions</h2>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full border-collapse border">
//                   <thead>
//                     <tr className="bg-gray-100">
//                       <th className="border p-2">Header</th>
//                       <th className="border p-2">Base</th>
//                       <th className="border p-2">Best</th>
//                       <th className="border p-2">Worst</th>
//                       <th className="border p-2">Direction</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {Object.entries(adjustedMetrics).map(([header, metric]) => (
//                       <tr key={header} className="hover:bg-gray-50">
//                         <td className="border p-2">{header}</td>
//                         <td className="border p-2">{metric.normalizedAverageBase.toFixed(2)}</td>
//                         <td className="border p-2">{metric.normalizedAverageBest.toFixed(2)}</td>
//                         <td className="border p-2">{metric.normalizedAverageWorst.toFixed(2)}</td>
//                         <td className="border p-2">
//                           <select
//                             value={normalizedDirections[header]}
//                             onChange={(e) => handleNormalizedDirectionChange(header, e.target.value)}
//                             className="w-full p-1 border rounded"
//                           >
//                             <option value="Positive">Positive</option>
//                             <option value="Negative">Negative</option>
//                           </select>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//               <div className="mt-4 space-x-4">
//                 <button 
//                   onClick={() => setStep(1)} 
//                   className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
//                 >
//                   Back
//                 </button>
//                 <button 
//                   onClick={handleFinalSubmit} 
//                   className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//                 >
//                   Submit
//                 </button>
//               </div>
//             </>
//           )}

//           {submitted && (
//             <>
//               <h2 className="text-xl font-bold mb-4">Final Normalized Values</h2>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full border-collapse border">
//                   <thead>
//                     <tr className="bg-gray-100">
//                       <th className="border p-2">Header</th>
//                       <th className="border p-2">Base</th>
//                       <th className="border p-2">Best</th>
//                       <th className="border p-2">Worst</th>
//                       {/* <th className="border p-2">Applied Direction</th> */}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {Object.entries(finalNormalizedValues).map(([header, metric]) => (
//                       <tr key={header} className="hover:bg-gray-50">
//                         <td className="border p-2">{header}</td>
//                         <td className="border p-2">{metric.normalizedAverageBase.toFixed(2)}</td>
//                         <td className="border p-2">{metric.normalizedAverageBest.toFixed(2)}</td>
//                         <td className="border p-2">{metric.normalizedAverageWorst.toFixed(2)}</td>
//                         {/* <td className="border p-2">{metric.appliedDirection}</td> */}
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// export default EclCalculator;


import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { abs, mean, std } from 'mathjs';
import './ecl.css';

function EclCalculator() {
  const [aggingexcelData, setAggingExcelData] = useState(null);
  const [calculatedMigrationData, setCalculatedMigrationData] = useState(null);
  const [calculatedAverageData, setCalculatedAverageData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [segments, setSegments] = useState([]); // Store available segments
  const [bucketOptions, setBucketOptions] = useState([]); // Store bucket options
  const [selectedSegments, setSelectedSegments] = useState({}); // Store selected segments and their buckets
  const [lossRates, setLossRates] = useState({}); // Store loss rates for each segment
  const [calculatedLossRates, setCalculatedLossRates] = useState(null);
  const [excelData, setExcelData] = useState({ data: {}, metrics: {} });
  const [directions, setDirections] = useState({});
  const [normalizedDirections, setNormalizedDirections] = useState({});
  const [adjustedMetrics, setAdjustedMetrics] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1); // Track current step
  const [finalNormalizedValues, setFinalNormalizedValues] = useState({});
  const [isAggingFileUploaded, setIsAggingFileUploaded] = useState(false);
  const [isMacroFileUploaded, setIsMacroFileUploaded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  

  // Function to handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      setIsAggingFileUploaded(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        // ... (keep existing file processing logic)
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

  const handleMacroUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      setIsMacroFileUploaded(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const formattedData = data.reduce((acc, row) => {
          const [status, year, ...values] = row;
          values.forEach((value, index) => {
            const header = data[0][index + 2];
            if (!acc[header]) {
              acc[header] = [];
            }
            acc[header].push({
              status,
              year,
              value,
            });
          });
          return acc;
        }, {});

        const metrics = Object.entries(formattedData).reduce((acc, [header, data]) => {
          const actualData = data.filter((item) => item.status === 'Actual');
          const actualValues = actualData.map((item) => item.value);
          const last5Years = actualData.slice(-5).map((item) => item.value);

          const forecastedData = data.filter((item) => item.status === 'Forecasted');
          const forecastedValues = forecastedData.map((item) => item.value);

          const adjustedForecastedValues = forecastedValues.map((value) => {
            const base = value;
            const bestCase = base + std(last5Years);
            const worstCase = base - std(last5Years);

            return {
              base,
              bestCase,
              worstCase,
              normalizedBase: abs(base - mean(actualValues)) / std(actualValues),
              normalizedBestCase: abs(bestCase - mean(actualValues)) / std(actualValues),
              normalizedWorstCase: abs(worstCase - mean(actualValues)) / std(actualValues),
            };
          });

          const normalizedAverages = adjustedForecastedValues.reduce(
            (avgAcc, { normalizedBase, normalizedBestCase, normalizedWorstCase }) => {
              avgAcc.totalBase += normalizedBase;
              avgAcc.totalBest += normalizedBestCase;
              avgAcc.totalWorst += normalizedWorstCase;
              avgAcc.count += 1;
              return avgAcc;
            },
            { totalBase: 0, totalBest: 0, totalWorst: 0, count: 0 }
          );

          acc[header] = {
            standardDeviation_last5: std(last5Years),
            normalizedAverageBase: normalizedAverages.totalBase / normalizedAverages.count,
            normalizedAverageBest: normalizedAverages.totalBest / normalizedAverages.count,
            normalizedAverageWorst: normalizedAverages.totalWorst / normalizedAverages.count,
          };

          return acc;
        }, {});

        const initialDirections = Object.keys(metrics).reduce((acc, header) => {
          acc[header] = 'Positive';
          return acc;
        }, {});

        setExcelData({ data: formattedData, metrics });
        setDirections(initialDirections);
        setNormalizedDirections(initialDirections);
        setAdjustedMetrics(metrics);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleDirectionChange = (header, value) => {
    setDirections((prev) => ({
      ...prev,
      [header]: value,
    }));
    setAdjustedMetrics((prev) => {
      const originalMetric = excelData.metrics[header];
      const adjustedMetric = {
        ...originalMetric,
        standardDeviation_last5:
          value === 'Positive'
            ? Math.abs(originalMetric.standardDeviation_last5)
            : -Math.abs(originalMetric.standardDeviation_last5),
      };
      return {
        ...prev,
        [header]: adjustedMetric,
      };
    });
  };

  const handleNormalizedDirectionChange = (header, value) => {
    setNormalizedDirections(prev => ({
      ...prev,
      [header]: value
    }));
  };

  const handleStepOneSubmit = () => {
    setStep(2);
  };

  const handleFinalSubmit = () => {
    // Calculate final normalized values with applied directions
    const finalValues = Object.entries(adjustedMetrics).reduce((acc, [header, metric]) => {
      acc[header] = {
        normalizedAverageBase: normalizedDirections[header] === 'Positive' ? 
          metric.normalizedAverageBase : abs(-metric.normalizedAverageBase),
        normalizedAverageBest: normalizedDirections[header] === 'Positive' ? 
          metric.normalizedAverageBest : abs(-metric.normalizedAverageBest),
        normalizedAverageWorst: normalizedDirections[header] === 'Positive' ? 
          metric.normalizedAverageWorst : abs(-metric.normalizedAverageWorst),
        appliedDirection: normalizedDirections[header]
      };
      return acc;
    }, {});

    setFinalNormalizedValues(finalValues);
    setSubmitted(true);
    console.log('Final Normalized Values:', finalValues);
    alert('Normalized values stored successfully!');
  };

  const { metrics } = useMemo(() => excelData, [excelData]);

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
      const segmentName = row[0]?.trim();
      const values = row.slice(1);

      if (!segmentName) return;

      if (!segmentGroups[segmentName]) {
        segmentGroups[segmentName] = [];
      }

      segmentGroups[segmentName].push(values);
    });

    return segmentGroups;
  }

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

  const handleSubmit = () => {
    if (Object.keys(selectedSegments).length > 0 && calculatedAverageData) {
      const filtered = Object.entries(calculatedAverageData).map(([key, row]) => {
        const segmentBucket = selectedSegments[key];
        const bucketIndex = bucketOptions.indexOf(segmentBucket);
        const values = row.slice(0, bucketIndex + 1);
        
        return [key, values];
      });

      setFilteredData(filtered);
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

  return (
    <div className="container">
     <h1>Excel Migration Calculator</h1>
      
      <div className="upload-section space-y-4">
        <div>
          <label htmlFor="aging" className="block mb-2">Aging Data File </label>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            name="aging" 
            onChange={handleFileUpload}
            className="block w-full text-sm border rounded-lg cursor-pointer" 
          />
          {isAggingFileUploaded && <span className="text-green-500 text-sm">✓ File uploaded</span>}
        </div>

        <div>
          <label htmlFor="macro" className="block mb-2">Macro Economics File </label>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            name="macro" 
            onChange={handleMacroUpload}
            className="block w-full text-sm border rounded-lg cursor-pointer" 
          />
          {isMacroFileUploaded && <span className="text-green-500 text-sm">✓ File uploaded</span>}
        </div>

        {isAggingFileUploaded && isMacroFileUploaded && !showResults && (
          <button 
            onClick={() => setShowResults(true)}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Show Results
          </button>
        )}
      </div>

      
      
      
      {showResults && calculatedMigrationData && (
        <>
          <div className="comparison-section">
            <h3>Compare Average Migration</h3>
            {segments.map((segment) => (
              <div key={segment} className="segment-selection">
                <label>Select Bucket for {segment}: </label>
                <select 
                  value={selectedSegments[segment] || ""} 
                  onChange={(e) => handleSegmentSelection(segment, e.target.value)}
                >
                  <option value="">Select Bucket</option>
                  {bucketOptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <button className="button-cal" onClick={handleSubmit}>Submit</button>
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
                  {filteredData.map(([segment, values], index) => (
                    <tr key={index}>
                      <td>{segment}</td>
                      {bucketOptions.map((_, i) => (
                        <td key={i}>
                          {values[i] ? `${values[i]}%` : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="loss-rate-inputs">
              {segments.map((segment) => (
  <div key={segment} className="segment-input">
    <label htmlFor={`lossRate-${segment}`} className="block">{segment} Loss Rate (%)</label>
    <input
      type="number"
      id={`lossRate-${segment}`}
      value={lossRates[segment] || ""}
      onChange={(e) => handleLossRateChange(segment, e.target.value)}
      className="block w-full text-sm border rounded-lg"
    />
  </div>
))}

                <button className="button-cal" onClick={handleCalculateLossRate}>
                  Calculate Loss Rates
                </button>
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
                      {Object.entries(calculatedLossRates).map(([segment, rates], index) => (
                        <tr key={index}>
                          <td>{segment}</td>
                          {rates.map((rate, i) => (
                            <td key={i}>{rate}%</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

{showResults && Object.keys(metrics).length > 0 && (
        <div>
          {step === 1 && !submitted && (
            <>
              <h2 className="text-xl font-bold mb-4">Step 1: Set Standard Deviation Directions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Header</th>
                      <th className="border p-2">Standard Deviation (Last 5 Years)</th>
                      <th className="border p-2">Direction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(adjustedMetrics).map(([header, metric]) => (
                      <tr key={header} className="hover:bg-gray-50">
                        <td className="border p-2">{header}</td>
                        <td className="border p-2">{metric.standardDeviation_last5.toFixed(2)}</td>
                        <td className="border p-2">
                          <select
                            value={directions[header]}
                            onChange={(e) => handleDirectionChange(header, e.target.value)}
                            className="w-full p-1 border rounded"
                          >
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button 
                onClick={handleStepOneSubmit} 
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Next Step
              </button>
            </>
          )}

          {step === 2 && !submitted && (
            <>
              <h2 className="text-xl font-bold mb-4">Set Normalized Average Directions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Header</th>
                      <th className="border p-2">Base</th>
                      <th className="border p-2">Best</th>
                      <th className="border p-2">Worst</th>
                      <th className="border p-2">Direction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(adjustedMetrics).map(([header, metric]) => (
                      <tr key={header} className="hover:bg-gray-50">
                        <td className="border p-2">{header}</td>
                        <td className="border p-2">{metric.normalizedAverageBase.toFixed(2)}</td>
                        <td className="border p-2">{metric.normalizedAverageBest.toFixed(2)}</td>
                        <td className="border p-2">{metric.normalizedAverageWorst.toFixed(2)}</td>
                        <td className="border p-2">
                          <select
                            value={normalizedDirections[header]}
                            onChange={(e) => handleNormalizedDirectionChange(header, e.target.value)}
                            className="w-full p-1 border rounded"
                          >
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-x-4">
                <button 
                  onClick={() => setStep(1)} 
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Back
                </button>
                <button 
                  onClick={handleFinalSubmit} 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Submit
                </button>
              </div>
            </>
          )}

          {submitted && (
            <>
              <h2 className="text-xl font-bold mb-4">Final Normalized Values</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Header</th>
                      <th className="border p-2">Base</th>
                      <th className="border p-2">Best</th>
                      <th className="border p-2">Worst</th>
                      {/* <th className="border p-2">Applied Direction</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(finalNormalizedValues).map(([header, metric]) => (
                      <tr key={header} className="hover:bg-gray-50">
                        <td className="border p-2">{header}</td>
                        <td className="border p-2">{metric.normalizedAverageBase.toFixed(2)}</td>
                        <td className="border p-2">{metric.normalizedAverageBest.toFixed(2)}</td>
                        <td className="border p-2">{metric.normalizedAverageWorst.toFixed(2)}</td>
                        {/* <td className="border p-2">{metric.appliedDirection}</td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default EclCalculator;
