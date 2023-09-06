
import React, { useRef, useState } from 'react';
import { array, string, bool } from 'prop-types';
import { angularize } from '../angular-react-helper';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Annotation, { AnnotationOptions } from 'chartjs-plugin-annotation';

Chart.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Annotation,
);

const BarChart = ({ chartData, axisTitle, lineAnnotations=null, isHorizontal=false }) => {

  const { colors } = useTheme();
  const [ numVisibleDatasets, setNumVisibleDatasets ] = useState(1);

  const barChartRef = useRef<Chart>(null);

  const defaultPalette = [
    '#c95465', // red oklch(60% 0.15 14)
    '#4a71b1', // blue oklch(55% 0.11 260)
    '#d2824e', // orange oklch(68% 0.12 52)
    '#856b5d', // brown oklch(55% 0.04 50)
    '#59894f', // green oklch(58% 0.1 140)
    '#e0cc55', // yellow oklch(84% 0.14 100)
    '#b273ac', // purple oklch(64% 0.11 330)
    '#f09da6', // pink oklch(78% 0.1 12)
    '#b3aca8', // grey oklch(75% 0.01 55)
    '#80afad', // teal oklch(72% 0.05 192)
  ]

  const indexAxis = isHorizontal ? 'y' : 'x';

  function getChartHeight() {
    /* when horizontal charts have more data, they should get taller
      so they don't look squished */
    if (isHorizontal) {
      // 'ideal' chart height is based on the number of datasets and number of unique index values
      const uniqueIndexVals = [];
      chartData.forEach(e => e.records.forEach(r => {
        if (!uniqueIndexVals.includes(r[indexAxis])) uniqueIndexVals.push(r[indexAxis]);
      }));
      const numIndexVals = uniqueIndexVals.length;
      const idealChartHeight = numVisibleDatasets * numIndexVals * 8;

      /* each index val should be at least 20px tall for visibility,
        and the graph itself should be at least 250px tall */
      const minChartHeight = Math.max(numIndexVals * 20, 250);

      // return whichever is greater
      return { height: Math.max(idealChartHeight, minChartHeight) };
    }
    // vertical charts will just match the parent container
    return { height: '100%' };
  }

  return (
    <View style={[getChartHeight(), {padding: 12}]}>
      <Bar ref={barChartRef}
        data={{
          datasets: chartData.map((d, i) => ({
            label: d.label,
            data: d.records,
            // cycle through the default palette, repeat if necessary
            backgroundColor: defaultPalette[i % defaultPalette.length],
          }))
        }}
        options={{
          indexAxis: indexAxis,
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 1,
          scales: {
            ...(isHorizontal ? {
              y: {
                offset: true,
                type: 'time',
                adapters: {
                  date: { zone: 'utc' },
                },
                time: {
                  unit: 'day',
                  tooltipFormat: 'DDD', // Luxon "localized date with full month": e.g. August 6, 2014
                },
                beforeUpdate: (axis) => {
                  setNumVisibleDatasets(axis.chart.getVisibleDatasetCount())
                },
                reverse: true,
              },
              x: {
                title: { display: true, text: axisTitle },
              },
            } : {
              x: {
                offset: true,
                type: 'time',
                adapters: {
                  date: { zone: 'utc' },
                },
                time: {
                  unit: 'day',
                  tooltipFormat: 'DDD', // Luxon "localized date with full month": e.g. August 6, 2014
                },
              },
              y: {
                title: { display: true, text: axisTitle },
              },
            }),
          },
          plugins: {
            ...(lineAnnotations?.length > 0 && {
              annotation: {
                annotations: lineAnnotations.map((a, i) => ({
                  type: 'line',
                  label: {
                    display: true,
                    padding: { x: 3, y: 1 },
                    borderRadius: 0,
                    backgroundColor: 'rgba(0,0,0,.7)',
                    color: 'rgba(255,255,255,1)',
                    font: { size: 10 },
                    position: 'start',
                    content: a.label,
                  },
                  ...(isHorizontal ? { xMin: a.value, xMax: a.value }
                    : { yMin: a.value, yMax: a.value }),
                  borderColor: colors.onBackground,
                  borderWidth: 2,
                  borderDash: [3, 3],
                } satisfies AnnotationOptions)),
              }
            }),
          }
        }} />
    </View>
  )
}

BarChart.propTypes = {
  chartData: array,
  axisTitle: string,
  lineAnnotations: array,
  isHorizontal: bool,
};

angularize(BarChart, 'BarChart', 'emission.main.barchart');
export default BarChart;

// const sampleAnnotations = [
//   { value: 35, label: 'Target1' },
//   { value: 65, label: 'Target2' },
// ];

// const sampleChartData = [
//   {
//     label: 'Primary',
//     records: [
//       { x: moment('2023-06-20'), y: 20 },
//       { x: moment('2023-06-21'), y: 30 },
//       { x: moment('2023-06-23'), y: 80 },
//       { x: moment('2023-06-24'), y: 40 },
//     ],
//   },
//   {
//     label: 'Secondary',
//     records: [
//       { x: moment('2023-06-21'), y: 10 },
//       { x: moment('2023-06-22'), y: 50 },
//       { x: moment('2023-06-23'), y: 30 },
//       { x: moment('2023-06-25'), y: 40 },
//     ],
//   },
//   {
//     label: 'Tertiary',
//     records: [
//       { x: moment('2023-06-20'), y: 30 },
//       { x: moment('2023-06-22'), y: 40 },
//       { x: moment('2023-06-24'), y: 10 },
//       { x: moment('2023-06-25'), y: 60 },
//     ],
//   },
//   {
//     label: 'Quaternary',
//     records: [
//       { x: moment('2023-06-22'), y: 10 },
//       { x: moment('2023-06-23'), y: 20 },
//       { x: moment('2023-06-24'), y: 30 },
//       { x: moment('2023-06-25'), y: 40 },
//     ],
//   },
// ];
