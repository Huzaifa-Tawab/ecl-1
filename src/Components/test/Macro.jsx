// import React, { useState, useMemo } from 'react';
// import * as XLSX from 'xlsx';
// import { abs, mean, std } from 'mathjs';

// const ExcelDataParser = () => {
//   const [excelData, setExcelData] = useState({ data: {}, metrics: {} });
//   const [directions, setDirections] = useState({});
//   const [normalizedDirections, setNormalizedDirections] = useState({});
//   const [adjustedMetrics, setAdjustedMetrics] = useState({});
//   const [submitted, setSubmitted] = useState(false);
//   const [step, setStep] = useState(1); // Track current step
//   const [finalNormalizedValues, setFinalNormalizedValues] = useState({});

//   const handleMacroUpload = (e) => {
//     const file = e.target.files[0];

//     if (file) {
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
//           metric.normalizedAverageBase : -metric.normalizedAverageBase,
//         normalizedAverageBest: normalizedDirections[header] === 'Positive' ? 
//           metric.normalizedAverageBest : -metric.normalizedAverageBest,
//         normalizedAverageWorst: normalizedDirections[header] === 'Positive' ? 
//           metric.normalizedAverageWorst : -metric.normalizedAverageWorst,
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

//   return (
//     <div className="p-4">
//       <div className="mb-4">
//         <label htmlFor="macro" className="block mb-2">Macro Economics File </label>
//         <input 
//           type="file" 
//           accept=".xlsx, .xls" 
//           name="macro" 
//           onChange={handleMacroUpload}
//           className="block w-full text-sm border rounded-lg cursor-pointer" 
//         />
//       </div>

//       {Object.keys(metrics).length > 0 && (
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
//               <h2 className="text-xl font-bold mb-4">Step 2: Set Normalized Average Directions</h2>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full border-collapse border">
//                   <thead>
//                     <tr className="bg-gray-100">
//                       <th className="border p-2">Header</th>
//                       <th className="border p-2">Normalized Average (Base)</th>
//                       <th className="border p-2">Normalized Average (Best)</th>
//                       <th className="border p-2">Normalized Average (Worst)</th>
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
//                       <th className="border p-2">Final Normalized Average (Base)</th>
//                       <th className="border p-2">Final Normalized Average (Best)</th>
//                       <th className="border p-2">Final Normalized Average (Worst)</th>
//                       <th className="border p-2">Applied Direction</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {Object.entries(finalNormalizedValues).map(([header, metric]) => (
//                       <tr key={header} className="hover:bg-gray-50">
//                         <td className="border p-2">{header}</td>
//                         <td className="border p-2">{metric.normalizedAverageBase.toFixed(2)}</td>
//                         <td className="border p-2">{metric.normalizedAverageBest.toFixed(2)}</td>
//                         <td className="border p-2">{metric.normalizedAverageWorst.toFixed(2)}</td>
//                         <td className="border p-2">{metric.appliedDirection}</td>
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
// };

// export default ExcelDataParser;


// import React, { useState, useMemo } from 'react';
// import * as XLSX from 'xlsx';
// import { abs, mean, std } from 'mathjs';

// const ExcelDataParser = () => {
//   const [excelData, setExcelData] = useState({ data: {}, metrics: {} });
//   const [directions, setDirections] = useState({});
//   const [normalizedDirections, setNormalizedDirections] = useState({});
//   const [adjustedMetrics, setAdjustedMetrics] = useState({});
//   const [submitted, setSubmitted] = useState(false);
//   const [step, setStep] = useState(1); // Track current step
//   const [finalNormalizedValues, setFinalNormalizedValues] = useState({});
//   const [weightages, setWeightages] = useState(""); // For storing user inputs for weightages

//   const handleMacroUpload = (e) => {
//     const file = e.target.files[0];

//     if (file) {
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

//   const handleWeightageChange = (header, segment, value) => {
//     setWeightages((prev) => ({
//       ...prev,
//       [header]: {
//         ...prev[header],
//         [segment]: value,
//       },
//     }));
//   };
  
  

//   const handleFinalSubmit = () => {
//     const segments = ["Segment 1", "Segment 2"];
//     const finalSegmentValues = {};
  
//     // Iterate over each segment
//     segments.forEach((segmentKey) => {
//       let totalBase = 0;
//       let totalBest = 0;
//       let totalWorst = 0;
  
//       // Iterate over each metric and calculate weighted values
//       Object.entries(adjustedMetrics).forEach(([header, metric]) => {
//         const weightage = parseFloat(weightages[header]?.[segmentKey]) || 0;
  
//         // Calculate weighted values for the current metric
//         const weightedBase = Math.abs(metric.normalizedAverageBase) * (weightage / 100);
//         const weightedBest = Math.abs(metric.normalizedAverageBest) * (weightage / 100);
//         const weightedWorst = Math.abs(metric.normalizedAverageWorst) * (weightage / 100);
  
//         // Add to the totals
//         totalBase += weightedBase;
//         totalBest += weightedBest;
//         totalWorst += weightedWorst;
//       });
  
//       // Store the results for the current segment
//       finalSegmentValues[segmentKey] = {
//         base: totalBase,
//         best: totalBest,
//         worst: totalWorst,
//       };
//     });
  
//     // Save and display the results
//     setFinalNormalizedValues(finalSegmentValues);
//     setSubmitted(true);
//     console.log("Final Normalized Values by Segment:", finalSegmentValues);
//     alert("Normalized values by segment stored successfully!");
//   };
  
  



  

//   const handleStepOneSubmit = () => {
//     setStep(2);
//   };


//   const { metrics } = useMemo(() => excelData, [excelData]);

//   return (
//     <div className="p-4">
//       <div className="mb-4">
//         <label htmlFor="macro" className="block mb-2">Macro Economics File </label>
//         <input 
//           type="file" 
//           accept=".xlsx, .xls" 
//           name="macro" 
//           onChange={handleMacroUpload}
//           className="block w-full text-sm border rounded-lg cursor-pointer" 
//         />
//       </div>

//       {Object.keys(metrics).length > 0 && (
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
//               <h2 className="text-xl font-bold mb-4">Step 2: Set Normalized Average Directions</h2>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full border-collapse border">
//                   <thead>
//                     <tr className="bg-gray-100">
//                       <th className="border p-2">Header</th>
//                       <th className="border p-2">Normalized Average (Base)</th>
//                       <th className="border p-2">Normalized Average (Best)</th>
//                       <th className="border p-2">Normalized Average (Worst)</th>
//                       <th className="border p-2">Direction</th>
//                       <th className="border p-2">Weightage</th>
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
//                         <td className="border p-2">
//   <label>Segment 1</label>
//   <input
//     type="text"
//     value={weightages[header]?.["Segment 1"] || ""}
//     onChange={(e) => handleWeightageChange(header, "Segment 1", e.target.value)}
//     className="w-full p-1 border rounded"
//     min="0"
//   />
//   <label>Segment 2</label>
//   <input
//     type="text"
//     value={weightages[header]?.["Segment 2"] || ""}
//     onChange={(e) => handleWeightageChange(header, "Segment 2", e.target.value)}
//     className="w-full p-1 border rounded"
//     min="0"
//   />
// </td>


//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//               <button
//                 onClick={handleFinalSubmit}
//                 className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//               >
//                 Submit Final Values
//               </button>
//             </>
//           )}
//         </div>
//       )}

//      {submitted && finalNormalizedValues && (
//   <div className="mt-4">
//     <h2 className="text-xl font-bold">Final Normalized Values by Segment</h2>
//     <table className="min-w-full border-collapse border">
//       <thead>
//         <tr className="bg-gray-100">
//           <th className="border p-2">Segment</th>
//           <th className="border p-2">Base</th>
//           <th className="border p-2">Best</th>
//           <th className="border p-2">Worst</th>
//         </tr>
//       </thead>
//       <tbody>
//         {Object.entries(finalNormalizedValues).map(([segment, values]) => (
//           <tr key={segment} className="hover:bg-gray-50">
//             <td className="border p-2">{segment}</td>
//             <td className="border p-2">{values.base.toFixed(2)}</td>
//             <td className="border p-2">{values.best.toFixed(2)}</td>
//             <td className="border p-2">{values.worst.toFixed(2)}</td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   </div>
// )}

//     </div>
//   );
// };

// export default ExcelDataParser;



import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { abs, mean, std } from 'mathjs';

const ExcelDataParser = () => {
  const [excelData, setExcelData] = useState({ data: {}, metrics: {} });
  const [directions, setDirections] = useState({});
  const [normalizedDirections, setNormalizedDirections] = useState({});
  const [adjustedMetrics, setAdjustedMetrics] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1); // Track current step
  const [finalNormalizedValues, setFinalNormalizedValues] = useState({});
  const [inputWeightages, setInputWeightages] = useState({});
  const [inputFactors, setInputFactors] = useState({});
  const [segmentStorage, setSegmentStorage] = useState({
    segment1: {},  // For Weightage Results
    segment2: {}   // For Factor Results
  });

  const handleMacroUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
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

  const handleInputWeightageChange = (header, value) => {
    setInputWeightages((prev) => ({
      ...prev,
      [header]: value,
    }));
  };

  const handleInputFactorChange = (header, value) => {
    setInputFactors((prev) => ({
      ...prev,
      [header]: value,
    }));
  };

  const handleStepOneSubmit = () => {
    setStep(2);
  };

  const handleFinalSubmit = () => {
    // Calculate final normalized values with applied directions
    const finalValues = Object.entries(adjustedMetrics).reduce((acc, [header, metric]) => {
      const direction = normalizedDirections[header] === 'Positive' ? 1 : -1;
      const weightage = inputWeightages[header] / 100 || 1; // Default weightage to 1 if not set
      const factor = inputFactors[header] / 100 || 0;
  
      // Calculate with weightage
      const weightageResult = {
        normalizedAverageBase: metric.normalizedAverageBase * direction * weightage,
        normalizedAverageBest: metric.normalizedAverageBest * direction * weightage,
        normalizedAverageWorst: metric.normalizedAverageWorst * direction * weightage,
      };
  
      // Calculate with factor
      const factorResult = {
        normalizedAverageBase: metric.normalizedAverageBase * direction * factor,
        normalizedAverageBest: metric.normalizedAverageBest * direction * factor,
        normalizedAverageWorst: metric.normalizedAverageWorst * direction * factor,
      };
  
      // Store both results
      acc[header] = {
        weightageResult,
        factorResult,
      };
  
      return acc;
    }, {});
  
    // Create segment storage with accumulated values
    const newSegmentStorage = {
      segment1: {
        base: 0,
        best: 0,
        worst: 0
      },
      segment2: {
        base: 0,
        best: 0,
        worst: 0
      }
    };

    // Accumulate values for each segment
    Object.entries(finalValues).forEach(([header, { weightageResult, factorResult }]) => {
      // Segment 1: Accumulate Weightage Results
      newSegmentStorage.segment1.base += weightageResult.normalizedAverageBase;
      newSegmentStorage.segment1.best += weightageResult.normalizedAverageBest;
      newSegmentStorage.segment1.worst += weightageResult.normalizedAverageWorst;

      // Segment 2: Accumulate Factor Results
      newSegmentStorage.segment2.base += factorResult.normalizedAverageBase;
      newSegmentStorage.segment2.best += factorResult.normalizedAverageBest;
      newSegmentStorage.segment2.worst += factorResult.normalizedAverageWorst;
    });

    // Round accumulated values to 2 decimal places
    Object.keys(newSegmentStorage).forEach(segment => {
      Object.keys(newSegmentStorage[segment]).forEach(key => {
        newSegmentStorage[segment][key] = Number(newSegmentStorage[segment][key].toFixed(2));
      });
    });

    setSegmentStorage(newSegmentStorage);
    setFinalNormalizedValues(finalValues);
    setSubmitted(true);

    console.log('Segment Storage:', newSegmentStorage);
    alert('Normalized values accumulated and stored successfully!');
  };

  

  const { metrics } = useMemo(() => excelData, [excelData]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <label htmlFor="macro" className="block mb-2">Macro Economics File </label>
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          name="macro" 
          onChange={handleMacroUpload}
          className="block w-full text-sm border rounded-lg cursor-pointer" 
        />
      </div>

      {Object.keys(metrics).length > 0 && (
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
              <h2 className="text-xl font-bold mb-4">Step 2: Set Normalized Average Directions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Header</th>
                      <th className="border p-2">Normalized Average (Base)</th>
                      <th className="border p-2">Normalized Average (Best)</th>
                      <th className="border p-2">Normalized Average (Worst)</th>
                      <th className="border p-2">Direction</th>
                      <th className="border p-2">Input Weightage</th>
                     
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
                        <td className="border p-2">
                          <input
                            type="number"
                            value={inputWeightages[header] || ''}
                            onChange={(e) => handleInputWeightageChange(header, e.target.value)}
                            className="w-full p-1 border rounded"
                        placeholder="0-100"

                          />
                      
                      <input
                        type="number"
                        value={inputFactors[header] || ''}
                        onChange={(e) => handleInputFactorChange(header, e.target.value)}
                        className="w-full p-1 border rounded"
                        placeholder="0-100"
                      />
                    </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button 
                onClick={handleFinalSubmit}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Submit
              </button>
            </>
          )}

{submitted && (
  <div className="mt-4">
    <h3 className="text-lg font-bold">Final Normalized Values</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Header</th>
            <th className="border p-2">Normalized Average (Base) with Weightage</th>
            <th className="border p-2">Normalized Average (Best) with Weightage</th>
            <th className="border p-2">Normalized Average (Worst) with Weightage</th>
            <th className="border p-2">Normalized Average (Base) with Factor</th>
            <th className="border p-2">Normalized Average (Best) with Factor</th>
            <th className="border p-2">Normalized Average (Worst) with Factor</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(finalNormalizedValues).map(([header, { weightageResult, factorResult }]) => (
            <tr key={header} className="hover:bg-gray-50">
              <td className="border p-2">{header}</td>
              <td className="border p-2">{weightageResult.normalizedAverageBase.toFixed(2)}</td>
              <td className="border p-2">{weightageResult.normalizedAverageBest.toFixed(2)}</td>
              <td className="border p-2">{weightageResult.normalizedAverageWorst.toFixed(2)}</td>
              <td className="border p-2">{factorResult.normalizedAverageBase.toFixed(2)}</td>
              <td className="border p-2">{factorResult.normalizedAverageBest.toFixed(2)}</td>
              <td className="border p-2">{factorResult.normalizedAverageWorst.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{submitted && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Segment Storage</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Segment</th>
                  <th className="border p-2">Base</th>
                  <th className="border p-2">Best</th>
                  <th className="border p-2">Worst</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="border p-2">Segment 1</td>
                  <td className="border p-2">{segmentStorage.segment1.base}</td>
                  <td className="border p-2">{segmentStorage.segment1.best}</td>
                  <td className="border p-2">{segmentStorage.segment1.worst}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="border p-2">Segment 2</td>
                  <td className="border p-2">{segmentStorage.segment2.base}</td>
                  <td className="border p-2">{segmentStorage.segment2.best}</td>
                  <td className="border p-2">{segmentStorage.segment2.worst}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

        </div>
      )}
    </div>
  );
};

export default ExcelDataParser;


