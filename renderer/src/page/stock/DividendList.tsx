import React from 'react';
import type { DividendInfo } from '../../api/stock';

interface DividendListProps {
  data: DividendInfo[];
}

export function DividendList({ data }: DividendListProps) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto">
      <table className="w-full text-sm min-w-[1000px]">
        <thead>
          <tr className="bg-blue-50 border-b border-blue-200">
            <th className="px-4 py-3 text-center text-slate-700 font-medium whitespace-nowrap">派息时间</th>
            <th className="px-4 py-3 text-center text-slate-700 font-medium whitespace-nowrap">每10股派息(税前,单位:元)</th>
            <th className="px-4 py-3 text-center text-slate-700 font-medium whitespace-nowrap">当日价格</th>
            <th className="px-4 py-3 text-center text-slate-700 font-medium whitespace-nowrap">收益率(税前)</th>
            <th className="px-4 py-3 text-center text-slate-700 font-medium whitespace-nowrap">收益率(税后)</th>
            <th className="px-4 py-3 text-center text-slate-700 font-medium whitespace-nowrap">每10股转增(单位:股)</th>
            <th className="px-4 py-3 text-center text-slate-700 font-medium whitespace-nowrap">每10股送股(单位:股)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            // 计算收益率
            // 收益率(税前) = (parseFloat(item.send) / parseFloat(item.o) / 10 * 100).toFixed(2)
            // 收益率(税后) = 收益率(税前) * 0.8 (假设税率为20%)
            const send = item.send ? parseFloat(item.send) : 0;
            const price = item.o ? parseFloat(item.o) : 0;
            const preTaxYield = send > 0 && price > 0
              ? (send / price / 10 * 100).toFixed(2)
              : '--';
            const afterTaxYield = send > 0 && price > 0
              ? (send / price / 10 * 100 * 0.8).toFixed(2)
              : '--';
            
            return (
              <tr
                key={index}
                className={`border-b border-slate-100 hover:bg-slate-50 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                <td className="px-4 py-3 text-center text-slate-800 whitespace-nowrap">
                  {item.cdate || item.sdate || '--'}
                </td>
                <td className="px-4 py-3 text-center text-green-600 font-medium whitespace-nowrap">
                  {send > 0 ? send.toFixed(3) : '0'}
                </td>
                <td className="px-4 py-3 text-center text-slate-800 whitespace-nowrap">
                  {price > 0 ? price.toFixed(2) : '--'}
                </td>
                <td className="px-4 py-3 text-center text-slate-800 whitespace-nowrap">{preTaxYield}</td>
                <td className="px-4 py-3 text-center text-slate-800 whitespace-nowrap">{afterTaxYield}</td>
                <td className="px-4 py-3 text-center text-slate-800 whitespace-nowrap">
                  {item.change && parseFloat(item.change) > 0 ? item.change : '0'}
                </td>
                <td className="px-4 py-3 text-center text-slate-800 whitespace-nowrap">
                  {item.give && parseFloat(item.give) > 0 ? item.give : '0'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

