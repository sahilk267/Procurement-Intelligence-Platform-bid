import axios from 'axios';
import * as cheerio from 'cheerio';

async function checkGeMSearch() {
  try {
    console.log('Testing GeM search endpoint...');
    const res = await axios.get('https://gem.gov.in/searchresult/query/', {
      timeout: 10000,
      params: { keyword: 'tender', page: 1 }
    });
    console.log('Status:', res.status);
    console.log('Length:', res.data.length);
    const $ = cheerio.load(res.data);
    console.log('Title:', $('title').text());
    console.log('Results found:', $('.result, .tender, .item').length);

    // Check for any content that looks like search results
    const content = $('body').text();
    console.log('Contains "tender":', content.toLowerCase().includes('tender'));
    console.log('Contains "procurement":', content.toLowerCase().includes('procurement'));

  } catch (e) { console.log('GeM search error:', e.message); }
}

async function checkEprocureSearch() {
  try {
    console.log('\nTesting eProcure search...');
    // Try the main search page
    const res = await axios.get('https://eprocure.gov.in/cppp/searchbyorg/', { timeout: 10000 });
    console.log('Status:', res.status);
    console.log('Length:', res.data.length);
    const $ = cheerio.load(res.data);
    console.log('Title:', $('title').text());

    // Look for search forms
    console.log('Forms:', $('form').length);
    $('form').each((i, el) => {
      const action = $(el).attr('action');
      console.log(`Form ${i}:`, action);
    });

  } catch (e) { console.log('eProcure search error:', e.message); }
}

checkGeMSearch().then(() => checkEprocureSearch());