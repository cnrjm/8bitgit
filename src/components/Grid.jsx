import React, { useState, useMemo, useEffect } from 'react';
import Buttons from './Buttons';
import { useGithub } from '../hooks/useGithub';
import { useGithubContributions } from '../hooks/useGithubContributions';

const Grid = () => {
  const { userData, accessToken } = useGithub();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const { contributions, loading } = useGithubContributions(userData?.login, selectedYear);
  const [grid, setGrid] = useState(null);
  
  const firstDay = useMemo(() => new Date(selectedYear, 0, 1), [selectedYear]);
  const lastDay = useMemo(() => new Date(selectedYear, 11, 31), [selectedYear]);
  const startDayIndex = firstDay.getDay();
  const endDayIndex = lastDay.getDay();
  
  const rows = 7;
  const cols = 53;
  const days = [
    { text: '', row: 0 },
    { text: 'Mon', row: 1 },
    { text: '', row: 2 },
    { text: 'Wed', row: 3 },
    { text: '', row: 4 },
    { text: 'Fri', row: 5 },
    { text: '', row: 6 }
  ];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const cellDates = useMemo(() => {
    const dates = Array(rows).fill().map(() => Array(cols).fill(null));
    let currentDate = new Date(selectedYear, 0, 1);
    currentDate.setDate(currentDate.getDate() - startDayIndex);

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        dates[row][col] = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    return dates;
  }, [selectedYear, startDayIndex]);

  // Reset grid when user changes or signs out
  useEffect(() => {
    if (!accessToken) {
      const emptyGrid = Array(rows).fill().map(() => Array(cols).fill(0));
      setGrid(emptyGrid);
    }
  }, [accessToken]);

  // Update grid when contributions change
  useEffect(() => {
    if (loading) return;

    const newGrid = Array(rows).fill().map(() => Array(cols).fill(0));
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const date = cellDates[row][col];
        if (date.getFullYear() !== selectedYear) {
          newGrid[row][col] = -1;
        } else if (contributions) {
          const dateStr = date.toISOString().split('T')[0];
          const contributionCount = contributions[dateStr] || 0;
          newGrid[row][col] = contributionCount > 0 ? 
            Math.min(Math.ceil(contributionCount / 5), 4) : 0;
        }
      }
    }
    
    setGrid(newGrid);
  }, [contributions, loading, cellDates, selectedYear, rows, cols]);

  const handleCellClick = (row, col) => {
    if (!grid || grid[row][col] === -1) return;
    const newGrid = grid.map((r, i) => 
      r.map((cell, j) => i === row && j === col ? selectedLevel : cell)
    );
    setGrid(newGrid);
  };

  const handleKeyPress = (e) => {
    const level = parseInt(e.key);
    if (level >= 0 && level <= 4) {
      setSelectedLevel(level);
    }
  };

  // Replace the current getCellColor function with this:
  const getCellColor = (value) => {
    if (value === -1) return 'bg-[#1e2430]';
    const colors = [
      'bg-[#161b22]', // 0 contributions
      'bg-[#0e4429]', // 1-3 contributions
      'bg-[#006d32]', // 4-9 contributions
      'bg-[#26a641]', // 10-19 contributions
      'bg-[#39d353]'  // 20+ contributions
    ];
    return colors[value];
  };

  // Update the contribution level mapping in the grid creation useEffect
  useEffect(() => {
    if (loading) return;

    const newGrid = Array(rows).fill().map(() => Array(cols).fill(0));
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const date = cellDates[row][col];
        if (date.getFullYear() !== selectedYear) {
          newGrid[row][col] = -1;
        } else if (contributions) {
          const dateStr = date.toISOString().split('T')[0];
          const contributionCount = contributions[dateStr] || 0;
          
          // Map contribution count to GitHub's levels
          let level = 0;
          if (contributionCount === 0) level = 0;
          else if (contributionCount <= 3) level = 1;
          else if (contributionCount <= 9) level = 2;
          else if (contributionCount <= 19) level = 3;
          else level = 4;
          
          newGrid[row][col] = level;
        }
      }
    }
    
    setGrid(newGrid);
  }, [contributions, loading, cellDates, selectedYear, rows, cols]);

  const yearOptions = Array.from({length: 17}, (_, i) => currentYear - 16 + i);

  const monthLabels = useMemo(() => {
    const labels = [];
    let currentDate = new Date(selectedYear, 0, 1);
    let currentMonth = -1;
    
    for (let col = 0; col < cols; col++) {
      if (currentDate.getMonth() !== currentMonth) {
        currentMonth = currentDate.getMonth();
        labels.push({ month: months[currentMonth], col });
      }
      currentDate.setDate(currentDate.getDate() + 7);
    }
    return labels;
  }, [selectedYear]);

  // Show loading state or grid based on conditions
  const showLoading = loading || !grid;
  
  return (
    <>
      <div className="w-full bg-[#0d1117] flex justify-center text-white py-8">
        {showLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="p-8 rounded-lg bg-[#0d1117] border-1">
              <div className="flex mb-2 ml-10 relative h-6">
                {monthLabels.map(({ month, col }, idx) => (
                  <div 
                    key={`${month}-${col}`} 
                    className="absolute text-sm text-gray-400"
                    style={{ 
                      left: `${col * 15}px`
                    }}
                  >
                    {month}
                  </div>
                ))}
              </div>

              <div className="flex">
                <div className="grid grid-rows-7 gap-[2px]">
                  {[...Array(rows)].map((_, row) => (
                    <div key={row} className="h-[14px] flex items-center">
                      <div className="w-8 text-sm text-gray-400 pr-12">
                        {days.find(day => day.row === row)?.text || ''}
                      </div>
                      <div className="flex gap-[2px]">
                        {[...Array(cols)].map((_, col) => {
                          const date = cellDates[row][col];
                          const isValidDate = date && date.getFullYear() === selectedYear;
                          return (
                            <div key={`${row}-${col}`} className="relative">
                              <button
                                onClick={() => handleCellClick(row, col)}
                                onMouseEnter={() => isValidDate && setHoveredDate(date)}
                                onMouseLeave={() => setHoveredDate(null)}
                                className={`w-[14px] h-[14px] rounded-sm ${getCellColor(grid[row][col])} 
                                  ${isValidDate ? 'hover:ring-1 hover:ring-white/30' : ''} transition-colors duration-200
                                  ${!isValidDate ? 'opacity-40 cursor-default' : ''}`}
                              />
                              {hoveredDate && date && hoveredDate.getTime() === date.getTime() && (
                                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 
                                  bg-gray-900 text-white text-sm py-2 px-3 rounded shadow-lg whitespace-nowrap z-10">
                                  {date.toLocaleDateString('en-US', { 
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 text-sm text-gray-400">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={`w-[14px] h-[14px] rounded-sm ${getCellColor(level)} 
                      ${selectedLevel === level ? 'ring-1 ring-white/30' : ''}`}
                  />
                ))}
                <span>More</span>
                
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="ml-4 bg-[#161b22] text-white border border-gray-700 rounded px-2 py-1 text-sm"
                  disabled={loading}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
      <Buttons 
        grid={grid}
        cellDates={cellDates}
        selectedYear={selectedYear}
      />
    </>
  );
};

export default Grid;