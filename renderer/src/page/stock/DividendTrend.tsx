import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DividendInfo } from '../../api/stock';

interface DividendTrendProps {
  data: DividendInfo[];
}

export function DividendTrend({ data }: DividendTrendProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current && data.length > 0) {
      // 准备图表数据：按时间倒序排列（最新时间在x=0位置）
      const chartData = data
        .map((item) => {
          const send = item.send ? parseFloat(item.send) : 0;
          const price = item.o ? parseFloat(item.o) : 0;
          const preTaxYield = send > 0 && price > 0
            ? parseFloat((send / price / 10 * 100).toFixed(2))
            : null;
          const date = item.cdate || item.sdate || '';
          return {
            date,
            preTaxYield,
            afterTaxYield: preTaxYield !== null ? preTaxYield * 0.8 : null
          };
        })
        .filter((item) => item.preTaxYield !== null)
        .sort((a, b) => {
          // 按日期倒序排列（最新的在前）
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

      const dates = chartData.map((item) => item.date);
      const preTaxYields = chartData.map((item) => item.preTaxYield);
      const afterTaxYields = chartData.map((item) => item.afterTaxYield);

      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const param = params[0];
            return `${param.name}<br/>${param.seriesName}: ${param.value}%`;
          }
        },
        legend: {
          data: ['收益率(税前)', '收益率(税后)'],
          top: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: dates,
          name: '时间',
          nameLocation: 'middle',
          nameGap: 30,
          axisLabel: {
            rotate: 45,
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          name: '收益率(%)',
          nameLocation: 'middle',
          nameGap: 50
        },
        series: [
          {
            name: '收益率(税前)',
            type: 'line',
            data: preTaxYields,
            smooth: true,
            itemStyle: {
              color: '#3b82f6'
            },
            lineStyle: {
              color: '#3b82f6'
            }
          },
          {
            name: '收益率(税后)',
            type: 'line',
            data: afterTaxYields,
            smooth: true,
            itemStyle: {
              color: '#10b981'
            },
            lineStyle: {
              color: '#10b981'
            }
          }
        ]
      };

      // 创建或更新图表实例
      if (!chartInstanceRef.current) {
        chartInstanceRef.current = echarts.init(chartRef.current);
      }
      chartInstanceRef.current.setOption(option);

      // 响应式调整
      const handleResize = () => {
        chartInstanceRef.current?.resize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    return () => {
      // 组件卸载时清理
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  return (
    <div ref={chartRef} className="flex-1 overflow-hidden p-4" style={{ minHeight: '400px' }} />
  );
}

