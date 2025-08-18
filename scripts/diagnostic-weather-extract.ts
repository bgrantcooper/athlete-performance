// scripts/diagnostic-weather-extract.ts
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { db } from '../app/lib/db.server';
import { events } from '../app/lib/schema';

console.log('=== DIAGNOSTIC WEATHER EXTRACTION ===');
console.log('This will help us understand the 83 vs 71 discrepancy\n');

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

// Step 3: Match current events with backup weather data
console.log('Step 3: Detailed matching analysis...');

interface MatchedUpdate {
  eventId: number;
  eventName: string;
  weatherData: string;
  temperature?: number;
  windSpeed?: number;
  windDirection?: string;
}

const matchedUpdates: MatchedUpdate[] = [];
const partialMatches: Array<{
  backupRecord: BackupWeatherRecord;
  currentEvent?: any;
  matchIssue: string;
}> = [];

for (const backupRecord of backupWeatherRecords) {
  // Try to find exact match first
  const exactMatch = currentEvents.find(current => 
    current.name === backupRecord.name &&
    current.description === backupRecord.description &&
    current.startDate.toISOString().split('T')[0] === backupRecord.startTime
  );
  
  if (exactMatch) {
    matchedUpdates.push({
      eventId: exactMatch.eventId,
      eventName: exactMatch.name,
      weatherData: backupRecord.weatherData,
      temperature: backupRecord.temperature,
      windSpeed: backupRecord.windSpeed,
      windDirection: backupRecord.windDirection
    });
  } else {
    // Check for partial matches to understand the issue
    const nameMatch = currentEvents.find(current => current.name === backupRecord.name);
    const nameAndDescMatch = currentEvents.find(current => 
      current.name === backupRecord.name && current.description === backupRecord.description
    );
    
    let matchIssue = '';
    if (!nameMatch) {
      matchIssue = 'No event with matching name found in current database';
    } else if (!nameAndDescMatch) {
      matchIssue = `Name matches but description differs. Current: "${nameMatch.description}"`;
    } else {
      const dateMatch = currentEvents.find(current => 
        current.name === backupRecord.name &&
        current.description === backupRecord.description &&
        current.startDate.toISOString().split('T')[0] === backupRecord.startTime
      );
      if (!dateMatch) {
        matchIssue = `Name and description match but date differs. Current: "${nameAndDescMatch.startDate.toISOString().split('T')[0]}"`;
      } else {
        matchIssue = 'Unknown matching issue';
      }
    }
    
    partialMatches.push({
      backupRecord,
      currentEvent: nameMatch || nameAndDescMatch,
      matchIssue
    });
  }
}

// Report results
console.log(`\n=== MATCHING RESULTS ===`);
console.log(`✅ Exact matches: ${matchedUpdates.length}`);
console.log(`❌ Unmatched backup records: ${partialMatches.length}`);
console.log(`📊 Total backup records: ${backupWeatherRecords.length}`);
console.log(`📊 Total current events: ${currentEvents.length}\n`);

// Show unmatched records with details
if (partialMatches.length > 0) {
  console.log(`=== UNMATCHED BACKUP RECORDS ===`);
  partialMatches.forEach((partial, index) => {
    console.log(`\n${index + 1}. BACKUP RECORD (line ${partial.backupRecord.originalLineNumber}):`);
    console.log(`   Name: "${partial.backupRecord.name}"`);
    console.log(`   Description: "${partial.backupRecord.description}"`);
    console.log(`   Date: "${partial.backupRecord.startTime}"`);
    console.log(`   Weather: temp=${partial.backupRecord.temperature}°F, wind=${partial.backupRecord.windSpeed}mph ${partial.backupRecord.windDirection}`);
    console.log(`   ❌ Issue: ${partial.matchIssue}`);
    if (partial.currentEvent) {
      console.log(`   📝 Similar current event: "${partial.currentEvent.name}" | "${partial.currentEvent.description}" | "${partial.currentEvent.startDate.toISOString().split('T')[0]}"`);
    }
  });
}

// Check for duplicate backup records
console.log(`\n=== DUPLICATE ANALYSIS ===`);
const duplicateGroups = new Map<string, BackupWeatherRecord[]>();

backupWeatherRecords.forEach(record => {
  const key = `${record.name}|${record.description}|${record.startTime}`;
  if (!duplicateGroups.has(key)) {
    duplicateGroups.set(key, []);
  }
  duplicateGroups.get(key)!.push(record);
});

const duplicates = Array.from(duplicateGroups.entries()).filter(([, records]) => records.length > 1);

if (duplicates.length > 0) {
  console.log(`Found ${duplicates.length} sets of duplicate backup records:`);
  duplicates.forEach(([key, records]) => {
    console.log(`  "${key}" appears ${records.length} times (lines: ${records.map(r => r.originalLineNumber).join(', ')})`);
  });
} else {
  console.log(`No duplicate backup records found`);
}

// Write detailed report
const reportLines = [
  '=== WEATHER EXTRACTION DIAGNOSTIC REPORT ===',
  `Generated: ${new Date().toISOString()}`,
  '',
  'SUMMARY:',
  `- Backup weather records: ${backupWeatherRecords.length}`,
  `- Current database events: ${currentEvents.length}`,
  `- Successful matches: ${matchedUpdates.length}`,
  `- Unmatched backup records: ${partialMatches.length}`,
  '',
  'UNMATCHED BACKUP RECORDS:',
  ...partialMatches.map((partial, index) => [
    `${index + 1}. Line ${partial.backupRecord.originalLineNumber}:`,
    `   Name: "${partial.backupRecord.name}"`,
    `   Description: "${partial.backupRecord.description}"`,
    `   Date: "${partial.backupRecord.startTime}"`,
    `   Issue: ${partial.matchIssue}`,
    ''
  ]).flat(),
  '',
  'DUPLICATE ANALYSIS:',
  duplicates.length > 0 
    ? duplicates.map(([key, records]) => `"${key}" appears ${records.length} times (lines: ${records.map(r => r.originalLineNumber).join(', ')})`).join('\n')
    : 'No duplicates found'
];

writeFileSync('weather_diagnostic_report.txt', reportLines.join('\n'));

console.log(`\n📄 Detailed report written to: weather_diagnostic_report.txt`);
console.log(`\nThis analysis should help explain the 83 vs 71 discrepancy!`);