import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { abs, mean, std } from 'mathjs';
import { norminv, normdist } from 'jstat';
import {jStat} from 'jstat'

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
  const [inputWeightages, setInputWeightages] = useState({});
  const [inputFactors, setInputFactors] = useState({});
  const [segmentStorage, setSegmentStorage] = useState({});
  const [directionImpact, setDirectionImpact] = useState({});
  const [individualDirections, setIndividualDirections] = useState({});

  // Add to existing state declarations
const [baselCorrelationResults, setBaselCorrelationResults] = useState(null);

// Modify the existing render section

const handleIndividualDirectionChange = (header, valueType, value) => {
  const currentMetric = adjustedMetrics[header];
  const multiplier = value === 'Negative' ? -1 : 1;
  
  let impact = {};
  
  // Only update the specific value type (base, best, or worst)
  if (valueType === 'base') {
    impact = {
      base: (currentMetric.normalizedAverageBase * multiplier).toFixed(2),
      best: directionImpact[header]?.best || currentMetric.normalizedAverageBest.toFixed(2),
      worst: directionImpact[header]?.worst || currentMetric.normalizedAverageWorst.toFixed(2)
    };
  } else if (valueType === 'best') {
    impact = {
      base: directionImpact[header]?.base || currentMetric.normalizedAverageBase.toFixed(2),
      best: (currentMetric.normalizedAverageBest * multiplier).toFixed(2),
      worst: directionImpact[header]?.worst || currentMetric.normalizedAverageWorst.toFixed(2)
    };
  } else if (valueType === 'worst') {
    impact = {
      base: directionImpact[header]?.base || currentMetric.normalizedAverageBase.toFixed(2),
      best: directionImpact[header]?.best || currentMetric.normalizedAverageBest.toFixed(2),
      worst: (currentMetric.normalizedAverageWorst * multiplier).toFixed(2)
    };
  }

  setDirectionImpact(prev => ({
    ...prev,
    [header]: impact
  }));

  // Store individual direction settings
  setIndividualDirections(prev => ({
    ...prev,
    [`${header}_${valueType}`]: value
  }));
};

// Add the calculation method to the component
const calculateBaselCorrelation = () => {
    // Validate prerequisites
    if (!calculatedLossRates || !segmentStorage) {
      alert('Please complete previous calculations first');
      return;
    }
  
    const baselResults = {};
  
    // Iterate through segments and calculate Basel correlation
    Object.keys(calculatedLossRates).forEach((segment) => {
      const lossRates = calculatedLossRates[segment];
      const segmentValues = segmentStorage[segment];
  
      const segmentResults = {
        segment,
        buckets: bucketOptions,
        lossRates: [], 
        assetCorrelations: [], 
        baseCase: [], 
        bestCase: [], 
        worseCase: [] 
      };
  
      // Calculate for each bucket
      lossRates.forEach((lossRate, bucketIndex) => {
        // Convert loss rate to decimal
        const pd = parseFloat(lossRate) / 100;
  
        // Asset correlation calculation based on Basel II formula
        const assetCorrelation = 
          0.03 * (1 - Math.exp(-35 * pd)) / (1 - Math.exp(-35)) + 
          0.16 * (1 - (1 - Math.exp(-35 * pd)) / (1 - Math.exp(-35)));
  
        // Calculate scenarios
        const baseResult = calculateBaselScenario(pd, assetCorrelation, segmentValues.base);
        const bestResult = calculateBaselScenario(pd, assetCorrelation, segmentValues.best);
        const worseResult = calculateBaselScenario(pd, assetCorrelation, segmentValues.worst);
  
        // Store calculated values
        segmentResults.lossRates.push(lossRate);
        segmentResults.assetCorrelations.push(assetCorrelation.toFixed(4));
        segmentResults.baseCase.push(baseResult.toFixed(4));
        segmentResults.bestCase.push(bestResult.toFixed(4));
        segmentResults.worseCase.push(worseResult.toFixed(4));
      });
  
      baselResults[segment] = segmentResults;
    });
  
    // Update state with Basel correlation results
    setBaselCorrelationResults(baselResults);
  };
  
  // Helper function to calculate Basel scenario
  const calculateBaselScenario = (pd, assetCorrelation, scenarioValue) => {
    try {
      // Step 1: NORMSINV of PD
      const normInvPD = jStat.normal.inv(pd, 0, 1);
  
      // Step 2: SQRT of asset correlation
      const sqrtAssetCorrelation = Math.sqrt(assetCorrelation);
  
      // Step 3: SQRT of (1 - asset correlation)
      const sqrtInverseAssetCorrelation = Math.sqrt(1 - assetCorrelation);
  
      // Step 4: Calculate z-score
      const zScore = (normInvPD - sqrtAssetCorrelation * scenarioValue) / 
                     sqrtInverseAssetCorrelation;
  
      // Step 5: NORMSDIST of z-score
      const result = jStat.normal.cdf(zScore, 0, 1);
  
      // Convert to percentage
      return result * 100;
    } catch (error) {
      // IFERROR handling - return 100% if calculation fails
      console.error('Basel scenario calculation error:', error);
      return 100;
    }
  };

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
    const currentMetric = adjustedMetrics[header];
    const multiplier = value === 'Negative' ? -1 : 1;
    
    const impact = {
      base: (currentMetric.normalizedAverageBase * multiplier).toFixed(2),
      best: (currentMetric.normalizedAverageBest * multiplier).toFixed(2),
      worst: (currentMetric.normalizedAverageWorst * multiplier).toFixed(2)
    };

    setDirectionImpact(prev => ({
      ...prev,
      [header]: impact
    }));

    setNormalizedDirections(prev => ({
      ...prev,
      [header]: value
    }));
  };


 // Update input change handler
const handleInputWeightageChange = (header, segment, value) => {
  setInputWeightages((prev) => ({
    ...prev,
    [`${header}_${segment}`]: value || 0, // Default to 100 if empty
  }));
};

  const handleStepOneSubmit = () => {
    setStep(2);
  };

  const handleFinalSubmit = () => {
    // Ensure data is loaded correctly
    if (!adjustedMetrics || !segments || segments.length === 0) {
      alert('Please ensure all data is loaded correctly');
      return;
    }
  
    try {
      // Calculate final normalized values with applied directions
      const finalValues = Object.entries(adjustedMetrics).reduce((acc, [header, metric]) => {
        const direction = normalizedDirections[header] === 'Positive' ? 1 : -1;
  
        const segmentResults = segments.map(segment => {
          const weightage = (inputWeightages[`${header}_${segment}`] || 0) / 100;
  
          return {
            segment,
            normalizedAverageBase: metric.normalizedAverageBase * direction * weightage,
            normalizedAverageBest: metric.normalizedAverageBest * direction * weightage,
            normalizedAverageWorst: metric.normalizedAverageWorst * direction * weightage,
          };
        });
  
        acc[header] = segmentResults;
        return acc;
      }, {});
  
      // Create dynamic segment storage based on actual segments
      const newSegmentStorage = segments.reduce((acc, segment) => {
        acc[segment] = { base: 0, best: 0, worst: 0 };
        return acc;
      }, {});
  
      // Accumulate values for each segment and apply directions
      Object.entries(finalValues).forEach(([header, segmentResults]) => {
        const multiplier = normalizedDirections[header] === 'Positive' ? 1 : -1;
        segmentResults.forEach(result => {
          newSegmentStorage[result.segment].base += result.normalizedAverageBase * multiplier;
          newSegmentStorage[result.segment].best += result.normalizedAverageBest * multiplier ;
          newSegmentStorage[result.segment].worst += result.normalizedAverageWorst * multiplier ;
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
  
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    } catch (error) {
      setErrors(prev => ({ ...prev, calculation: "Error calculating final results" }));
      setSubmitted(false);
      console.error('Error in final submit:', error);
      alert('An error occurred during calculation. Please check your inputs.');
    }
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
    <label htmlFor={`lossRate-${segment}`} className="block">{segment} Loss Rate</label>
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
     <h2 className="text-xl font-bold mb-4">Step 2: Set Individual Value Directions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Header</th>
                  <th className="border p-2">Value Type</th>
                  <th className="border p-2">Original Value</th>
                  <th className="border p-2">Direction</th>
                  <th className="border p-2">Adjusted Value</th>
                  {segments.map(segment => (
                    <th key={segment} className="border p-2">Weightage ({segment})</th>
                  ))}
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
                          value={individualDirections[`${header}_base`] || 'Positive'}
                          onChange={(e) => handleIndividualDirectionChange(header, 'base', e.target.value)}
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
                          value={individualDirections[`${header}_best`] || 'Positive'}
                          onChange={(e) => handleIndividualDirectionChange(header, 'best', e.target.value)}
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
                          value={individualDirections[`${header}_worst`] || 'Positive'}
                          onChange={(e) => handleIndividualDirectionChange(header, 'worst', e.target.value)}
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

{/* Replace the erroring table with this corrected version */}
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
                const baseValue = baseDirection === 'Negative' 
                  ? -result.normalizedAverageBase 
                  : result.normalizedAverageBase;

                const bestValue = bestDirection === 'Negative' 
                  ? -result.normalizedAverageBest 
                  : result.normalizedAverageBest;

                const worstValue = worstDirection === 'Negative' 
                  ? -result.normalizedAverageWorst 
                  : result.normalizedAverageWorst;

                return (
                  <React.Fragment key={index}>
                    <td className="border p-2">
                      {baseValue.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      {bestValue.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      {worstValue.toFixed(2)}
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
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
)}

{submitted && calculatedLossRates && (
        <div className="mt-4">
          <button 
            onClick={calculateBaselCorrelation}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Calculate Basel Correlation
          </button>
        </div>
      )}


{baselCorrelationResults && (
         <div className="mt-4">
         <h3 className="text-lg font-bold">Basel Correlation Results</h3>
         <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buckets</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loss Rate (%)</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Correlation</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Case (%)</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Case (%)</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worse Case (%)</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {Object.entries(baselCorrelationResults).map(([segmentName, segmentData]) => (
                 segmentData.buckets.map((bucket, index) => (
                   <tr key={`${segmentName}-${bucket}`} className="hover:bg-gray-50">
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                       {segmentName}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {bucket}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {segmentData.lossRates[index]}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {segmentData.assetCorrelations[index]}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {segmentData.baseCase[index]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {segmentData.bestCase[index]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {segmentData.worseCase[index]}
                </td>
                   </tr>
                 ))
               ))}
             </tbody>
           </table>
         </div>
       </div>
      )}

      
    </div>
  );
}

export default EclCalculator;