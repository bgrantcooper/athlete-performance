// scripts/fix-apostrophe-weather.ts
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { db } from '../app/lib/db.server';
import { events } from '../app/lib/schema';

console.log('=== FIXING APOSTROPHE WEATHER RECORDS ===');
console.log('Targeting the 11 records with apostrophe encoding differences\n');

// Helper function to normalize apostrophes
const normalizeApostrophes = (str: string) => str.replace(/''/g, "'");

// Step 1: Get all events from current database
console.log('Step 1: Fetching events from current database...');
const currentEvents = await db.select({
  eventId: events.id,
  name: events.name,
  description: events.description,
  startDate: events.scheduledStartTime
}).from(events);

console.log(`Found ${currentEvents.length} events in current database\n`);

// Step 2: Read backup file and find weather data lines
console.log('Step 2: Reading backup file...');
const backupContent = readFileSync('backup_data.sql', 'utf8');

const weatherLines = backupContent
  .split('\n')
  .filter(line => line.includes('"data_source":"Visual Crossing Weather API"}'));

console.log(`Found ${weatherLines.length} events with weather data in backup\n`);

interface BackupWeatherRecord {
  name: string;
  description: string;
  startTime: string;
  weatherData: string;
  temperature?: number;
  windSpeed?: number;
  windDirection?: string;
  originalLineNumber?: number;
}

// Parse backup weather lines
const backupWeatherRecords: BackupWeatherRecord[] = [];

weatherLines.forEach((line, index) => {
  try {
    const valuesMatch = line.match(/VALUES \((.*)\);/);
    if (!valuesMatch) return;
    
    const values = valuesMatch[1];
    
    // Parse the line carefully
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let braceDepth = 0;
    
    for (let i = 0; i < values.length; i++) {
      const char = values[i];
      
      if (char === "'" && values[i-1] !== '\\') {
        inQuotes = !inQuotes;
      }
      
      if (char === '{' && inQuotes) braceDepth++;
      if (char === '}' && inQuotes) braceDepth--;
      
      if (char === ',' && !inQuotes && braceDepth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    
    // Extract the fields we need
    const name = parts[7]?.replace(/^'|'$/g, '') || '';
    const startTime = parts[10]?.replace(/^'|'$/g, '') || '';
    
    // Find description 
    let description = '';
    for (let i = 20; i < 30; i++) {
      if (parts[i] && parts[i].includes(' - ') && !parts[i].includes('"date":')) {
        description = parts[i].replace(/^'|'$/g, '');
        break;
      }
    }
    
    // Find weather data and extract summary fields
    const weatherIndex = parts.findIndex(part => part.includes('"data_source":"Visual Crossing Weather API"'));
    if (weatherIndex === -1) return;
    
    const weatherData = parts[weatherIndex].replace(/^'|'$/g, '');
    
    // Extract summary weather fields that come after the JSON
    const temperature = weatherIndex + 2 < parts.length ? parseFloat(parts[weatherIndex + 2]) : undefined;
    const windSpeed = weatherIndex + 3 < parts.length ? parseFloat(parts[weatherIndex + 3]) : undefined;
    const windDirection = weatherIndex + 4 < parts.length ? parts[weatherIndex + 4]?.replace(/^'|'$/g, '') : undefined;
    
    backupWeatherRecords.push({
      name,
      description,
      startTime: startTime.split(' ')[0], // Just the date
      weatherData,
      temperature: isNaN(temperature!) ? undefined : temperature,
      windSpeed: isNaN(windSpeed!) ? undefined : windSpeed,
      windDirection: windDirection === 'NULL' ? undefined : windDirection,
      originalLineNumber: index + 1
    });
    
  } catch (error) {
    console.log(`Error parsing backup line ${index + 1}:`, (error as Error).message);
  }
});

console.log(`Parsed ${backupWeatherRecords.length} weather records from backup\n`);

// Step 3: Find records that failed exact match but work with normalized apostrophes
console.log('Step 3: Finding apostrophe-mismatched records...');

interface ApostropheFix {
  eventId: number;
  eventName: string;
  backupRecord: BackupWeatherRecord;
}

const apostropheFixes: ApostropheFix[] = [];

for (const backupRecord of backupWeatherRecords) {
  // First try exact match
  const exactMatch = currentEvents.find(current => 
    current.name === backupRecord.name &&
    current.description === backupRecord.description &&
    current.startDate.toISOString().split('T')[0] === backupRecord.startTime
  );
  
  // If no exact match, try with normalized apostrophes
  if (!exactMatch) {
    const normalizedMatch = currentEvents.find(current => 
      normalizeApostrophes(current.name) === normalizeApostrophes(backupRecord.name) &&
      normalizeApostrophes(current.description) === normalizeApostrophes(backupRecord.description) &&
      current.startDate.toISOString().split('T')[0] === backupRecord.startTime
    );
    
    if (normalizedMatch) {
      apostropheFixes.push({
        eventId: normalizedMatch.eventId,
        eventName: normalizedMatch.name,
        backupRecord
      });
      console.log(`✅ Found apostrophe fix: "${normalizedMatch.name}" (event_id: ${normalizedMatch.eventId})`);
    }
  }
}

console.log(`\nFound ${apostropheFixes.length} records that can be fixed with apostrophe normalization\n`);

// Step 4: Generate UPDATE statements
if (apostropheFixes.length > 0) {
  const sqlUpdates = apostropheFixes.map(fix => {
    const safeWeatherData = fix.backupRecord.weatherData.replace(/'/g, "''");
    
    let updateFields = [`weather_conditions = '${safeWeatherData}'`];
    
    if (fix.backupRecord.temperature !== undefined) {
      updateFields.push(`temperature = ${fix.backupRecord.temperature}`);
    }
    if (fix.backupRecord.windSpeed !== undefined) {
      updateFields.push(`wind_speed = ${fix.backupRecord.windSpeed}`);
    }
    if (fix.backupRecord.windDirection !== undefined) {
      updateFields.push(`wind_direction = '${fix.backupRecord.windDirection}'`);
    }
    
    return `-- ${fix.eventName} (event_id: ${fix.eventId})
-- Backup line ${fix.backupRecord.originalLineNumber}: temp=${fix.backupRecord.temperature}°F, wind=${fix.backupRecord.windSpeed}mph ${fix.backupRecord.windDirection}
UPDATE events 
SET ${updateFields.join(', ')}
WHERE event_id = ${fix.eventId};`;
  }).join('\n\n');

  // Write to file
  const outputSql = `-- Apostrophe-fix weather updates
-- Generated on ${new Date().toISOString()}
-- Fixes ${apostropheFixes.length} records with apostrophe encoding differences
-- Updates weather_conditions + temperature + wind_speed + wind_direction

${sqlUpdates}
`;

  writeFileSync('apostrophe_weather_fixes.sql', outputSql);

  // Create summary
  const summary = apostropheFixes.map(fix => 
    `event_id ${fix.eventId}: ${fix.eventName} (${fix.backupRecord.temperature || 'N/A'}°F, ${fix.backupRecord.windSpeed || 'N/A'} mph ${fix.backupRecord.windDirection || 'N/A'})`
  ).join('\n');

  writeFileSync('apostrophe_fixes_summary.txt', `Apostrophe Weather Fixes:\n\nTotal fixes: ${apostropheFixes.length}\n\n${summary}`);

  console.log('✅ SQL updates written to: apostrophe_weather_fixes.sql');
  console.log('✅ Summary written to: apostrophe_fixes_summary.txt');
  console.log(`\nApply with: psql -d athlete-performance -f apostrophe_weather_fixes.sql`);
  console.log(`\nThis should recover ${apostropheFixes.length} additional weather records!`);
} else {
  console.log('❌ No apostrophe-fixable records found. All mismatches may be due to other issues.');
}

// Show any remaining unmatched records
console.log('\n=== SUMMARY ===');
console.log(`📊 Total backup weather records: ${backupWeatherRecords.length}`);
console.log(`✅ Records that can be fixed: ${apostropheFixes.length}`);
console.log(`❓ Remaining unmatched: ${backupWeatherRecords.length - 71 - apostropheFixes.length} (these need manual investigation)`);

if (apostropheFixes.length === 11) {
  console.log('\n🎉 Perfect! This should fix all 11 apostrophe-related mismatches.');
  console.log('After applying these fixes, you should have weather data for 71 + 11 = 82 events.');
  console.log('Only the missing "SUNDAY SPRINTS! 14\'\' SUP" event will remain unmatched.');
}