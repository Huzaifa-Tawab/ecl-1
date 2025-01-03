// MacroDataProcessor.js
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { abs, mean, std } from 'mathjs';

const MacroDataProcessor = ({ onMacroData, segments }) => {
  const [isMacroFileUploaded, setIsMacroFileUploaded] = useState(false);
  const [excelData, setExcelData] = useState({ data: {}, metrics: {} });
  const [directions, setDirections] = useState({});
  const [normalizedDirections, setNormalizedDirections] = useState({});
  const [adjustedMetrics, setAdjustedMetrics] = useState({});
  const [inputWeightages, setInputWeightages] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [directionImpact, setDirectionImpact] = useState({});
  const [segmentStorage, setSegmentStorage] = useState({});
  const [finalNormalizedValues, setFinalNormalizedValues] = useState({});
  const [individualDirections, setIndividualDirections] = useState({});
  

  const downloadMacroTemplate = () => {
    const template = {
      'Status': ['Actual', 'Actual', 'Forecasted'],
      'Year': ['2023', '2024', '2025'],
      'GDP': [2.5, 2.7, 2.8],
      'Inflation': [3.1, 2.9, 2.8],
      'Unemployment': [4.2, 4.0, 3.9]
    };
    
    const ws = XLSX.utils.json_to_sheet(
      Object.keys(template).map((_, i) => 
        Object.fromEntries(Object.entries(template).map(([k, v]) => [k, v[i]]))
      )
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Macro Data");
    XLSX.writeFile(wb, "macro_template.xlsx");
  };

   const handleFinalSubmit = () => {
    // setErrors(prev => ({ ...prev, calculation: "" }));

    if (!adjustedMetrics || !segments || segments.length === 0) {
      alert('Please ensure all data is loaded correctly');
      return;
    }

    try {
      // Calculate final normalized values with applied directions
      const finalValues = Object.entries(adjustedMetrics).reduce((acc, [header, metric]) => {
    
        const segmentResults = segments.map(segment => {
          const weightage = (inputWeightages[`${header}_${segment}`] || 0) / 100;

          return {
            segment,
            normalizedAverageBase: metric.normalizedAverageBase *  weightage,
            normalizedAverageBest: metric.normalizedAverageBest * weightage,
            normalizedAverageWorst: metric.normalizedAverageWorst * weightage,
          };
        });

        acc[header] = segmentResults;
        return acc;
      }, {});
   
      
      // Create dynamic segment storage based on actual segments
      const newSegmentStorage = segments.reduce((acc, segment) => {
        acc[segment] = {
          base: 0,
          best: 0,
          worst: 0
        };
        return acc;
      }, {});

      // Accumulate values for each segment
      Object.entries(finalValues).forEach(([header, segmentResults]) => {
        const multiplier = normalizedDirections[header] === 'Positive' ? 1 : -1;
        segmentResults.forEach(result => {
          newSegmentStorage[result.segment].base += result.normalizedAverageBase * multiplier;
          newSegmentStorage[result.segment].best += result.normalizedAverageBest * multiplier;
          newSegmentStorage[result.segment].worst += result.normalizedAverageWorst * multiplier;
        });
      });


      // Round accumulated values
      Object.keys(newSegmentStorage).forEach(segment => {
        Object.keys(newSegmentStorage[segment]).forEach(key => {
          newSegmentStorage[segment][key] = Number(newSegmentStorage[segment][key].toFixed(2));
        });
      });

      setSegmentStorage(newSegmentStorage);
      setFinalNormalizedValues(finalValues);
      setSubmitted(true);
      // setShowResults(false);
      onMacroData(newSegmentStorage);

      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    } catch (error) {
    //   setErrors(prev => ({ ...prev, calculation: "Error calculating final results" }));
      setSubmitted(false);
      console.error('Error in final submit:', error);
      alert('An error occurred during calculation. Please check your inputs.');
    }
  };

    const handleStepOneSubmit = () => {
    setStep(2);
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

  const handleInputWeightageChange = (header, segment, value) => {
    setInputWeightages((prev) => ({
      ...prev,
      [`${header}_${segment}`]: value || 0, // Default to 100 if empty
    }));
  };

  return (
    <div className="macro-data-section">
      <h2 className="text-xl font-bold mb-4">Macro Data Processing</h2>
      <button onClick={downloadMacroTemplate} className="ecl-button">
        Download Macro Template
      </button>
      
      <div className="upload-section">
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
                                            <>
                                              {/* Base Case Row */}
                                              <tr key={`${header}_base`} className="hover:bg-gray-50">
                                                <td rowSpan="3" className="border p-2">{header}</td>
                                                <td className="border p-2">Base</td>
                                                <td className="border p-2">{metric.normalizedAverageBase.toFixed(2)}</td>
                                                <td className="border p-2">
                                                  <select
                                                    // value={individualDirections[`${header}_base`] || 'Positive'}
                                                    onChange={(e) => {
                                                      const direction = e.target.value;
                                                      let sign = direction === 'Negative' ? -1 : 1;
                                                      console.log(adjustedMetrics);
                      
                                                      setAdjustedMetrics(prevMetrics => {
                                                        const updatedMetrics = { ...prevMetrics };
                                                        updatedMetrics[header] = {
                                                          normalizedAverageBase: Math.abs(metric.normalizedAverageBase) * sign,
                                                          normalizedAverageBest: (metric.normalizedAverageBest),
                                                          normalizedAverageWorst: (metric.normalizedAverageWorst),
                                                        };
                                                        return updatedMetrics;
                                                      });
                                                    }}
                                                    className="w-full p-1 border rounded"
                                                  >
                                                    <option value="Positive">Positive</option>
                                                    <option value="Negative">Negative</option>
                                                  </select>
                                                </td>
                                                <td className="border p-2 font-bold text-blue-600">
                                                  {directionImpact[header]?.base || metric.normalizedAverageBase.toFixed(2)}
                                                </td>
                                                {segments.map((segment) => (
                                                  <td key={segment} className="border p-2">
                                                    <input
                                                      type="number"
                                                      value={inputWeightages[`${header}_${segment}`] || 0}
                                                      onChange={(e) => handleInputWeightageChange(header, segment, e.target.value)}
                                                      className="w-full p-1 border rounded"
                                                      placeholder="0-100"
                                                      min="0"
                                                      max="100"
                                                    />
                                                  </td>
                                                ))}
                                              </tr>
                                              {/* Best Case Row */}
                                              <tr key={`${header}_best`} className="hover:bg-gray-50">
                                                <td className="border p-2">Best</td>
                                                <td className="border p-2">{metric.normalizedAverageBest.toFixed(2)}</td>
                                                <td className="border p-2">
                                                  <select
                                                    // value={individualDirections[`${header}_best`] || 'Positive'}
                                                    onChange={(e) => {
                                                      const direction = e.target.value;
                                                      let sign = direction === 'Negative' ? -1 : 1;
                                                      console.log(adjustedMetrics);
                      
                                                      setAdjustedMetrics(prevMetrics => {
                                                        const updatedMetrics = { ...prevMetrics };
                                                        updatedMetrics[header] = {
                                                          normalizedAverageBase: (metric.normalizedAverageBase),
                                                          normalizedAverageBest: Math.abs(metric.normalizedAverageBest) * sign,
                                                          normalizedAverageWorst: (metric.normalizedAverageWorst),
                                                        };
                                                        return updatedMetrics;
                                                      });
                                                    }}
                                                    className="w-full p-1 border rounded"
                                                  >
                                                    <option value="Positive">Positive</option>
                                                    <option value="Negative">Negative</option>
                                                  </select>
                                                </td>
                                                <td className="border p-2 font-bold text-green-600">
                                                  {directionImpact[header]?.best || metric.normalizedAverageBest.toFixed(2)}
                                                </td>
                                                <td colSpan={segments.length}></td>
                                              </tr>
                                              {/* Worst Case Row */}
                                              <tr key={`${header}_worst`} className="hover:bg-gray-50">
                                                <td className="border p-2">Worst</td>
                                                <td className="border p-2">{metric.normalizedAverageWorst.toFixed(2)}</td>
                                                <td className="border p-2">
                                                  <select
                                                    // value={individualDirections[`${header}_worst`] || 'Positive'}
                                                    onChange={(e) => {
                                                      const direction = e.target.value;
                                                      let sign = direction === 'Negative' ? -1 : 1;
                                                      console.log(adjustedMetrics);
                      
                                                      setAdjustedMetrics(prevMetrics => {
                                                        const updatedMetrics = { ...prevMetrics };
                                                        updatedMetrics[header] = {
                                                          normalizedAverageBase: (metric.normalizedAverageBase),
                                                          normalizedAverageBest: (metric.normalizedAverageBest),
                                                          normalizedAverageWorst: Math.abs(metric.normalizedAverageWorst) * sign,
                                                        };
                                                        return updatedMetrics;
                                                      });
                                                    }}
                                                    className="w-full p-1 border rounded"
                                                  >
                                                    <option value="Positive">Positive</option>
                                                    <option value="Negative">Negative</option>
                                                  </select>
                                                </td>
                                                <td className="border p-2 font-bold text-red-600">
                                                  {directionImpact[header]?.worst || metric.normalizedAverageWorst.toFixed(2)}
                                                </td>
                                                <td colSpan={segments.length}></td>
                                              </tr>
                                            </>
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

                 {/* Displaying Final Normalized Values and Segment Storage After Calculation */}
                                {submitted && (
                                  <div className="mt-4">
                                    <h3 className="text-lg font-bold">Final Normalized Values</h3>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full border-collapse border">
                                        <thead>
                                          <tr className="bg-gray-100">
                                            <th className="border p-2">Header</th>
                                            {segments.map((segment) => (
                                              <React.Fragment key={segment}>
                                                <th className="border p-2">{segment} Base</th>
                                                <th className="border p-2">{segment} Best</th>
                                                <th className="border p-2">{segment} Worst</th>
                                              </React.Fragment>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(finalNormalizedValues).map(([header, segmentResults]) => (
                                            <tr key={header} className="hover:bg-gray-50">
                                              <td className="border p-2">{header}</td>
                                              {segmentResults.map((result, index) => {
                                                const baseDirection = individualDirections[`${header}_base`] || 'Positive';
                                                const bestDirection = individualDirections[`${header}_best`] || 'Positive';
                                                const worstDirection = individualDirections[`${header}_worst`] || 'Positive';
                      
                                                // Apply direction logic for the base, best, and worst values
                                                const baseValue = baseDirection === 'Negative' ? -result.normalizedAverageBase : result.normalizedAverageBase;
                                                const bestValue = bestDirection === 'Negative' ? -result.normalizedAverageBest : result.normalizedAverageBest;
                                                const worstValue = worstDirection === 'Negative' ? -result.normalizedAverageWorst : result.normalizedAverageWorst;
                      
                                                return (
                                                  <React.Fragment key={index}>
                                                    <td className="border p-2">{baseValue.toFixed(2)}</td>
                                                    <td className="border p-2">{bestValue.toFixed(2)}</td>
                                                    <td className="border p-2">{worstValue.toFixed(2)}</td>
                                                  </React.Fragment>
                                                );
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <h3 className="text-lg font-bold mt-4">Segment Storage</h3>
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
                                          {Object.entries(segmentStorage).map(([segment, values]) => (
                                            <tr key={segment}>
                                              <td className="border p-2">{segment}</td>
                                              <td className="border p-2">{values.base.toFixed(2)}</td>
                                              <td className="border p-2">{values.best.toFixed(2)}</td>
                                              <td className="border p-2">{values.worst.toFixed(2)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                
              </div>
  );
};
export default MacroDataProcessor;