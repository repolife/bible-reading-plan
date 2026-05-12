import React from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';

export const ThemeTest = () => {
  const { theme, changeTheme } = useTheme();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Theme Test</h2>
      
      <div className="space-y-2">
        <p>Current theme: <span className="font-mono bg-gray-200 p-2 rounded">{theme}</span></p>
        
        <div className="flex gap-2">
          <button 
            onClick={() => changeTheme('light')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Light
          </button>
          <button 
            onClick={() => changeTheme('dark')}
            className="px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors"
          >
            Dark
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-primary-500 text-white rounded-lg">
          <h3 className="font-bold">Primary Card</h3>
          <p>This uses the theme's primary color</p>
        </div>
        
        <div className="p-4 bg-secondary-500 text-white rounded-lg">
          <h3 className="font-bold">Secondary Card</h3>
          <p>This uses the theme's secondary color</p>
        </div>
        
        <div className="p-4 bg-accent-500 text-white rounded-lg">
          <h3 className="font-bold">Accent Card</h3>
          <p>This uses the theme's accent color</p>
        </div>
        
        <div className="p-4 bg-neutral-100 border border-neutral-300 rounded-lg">
          <h3 className="font-bold">Neutral Card</h3>
          <p>This uses the theme's neutral colors</p>
        </div>
      </div>
    </div>
  );
}; 