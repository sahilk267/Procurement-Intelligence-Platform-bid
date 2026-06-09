import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { db } from '@workspace/db';
import { tendersTable } from '@workspace/db';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from './logger';
import https from 'https';

interface TenderData {
  title: string;
  referenceNumber: string;
  authority: string;
  category: string;
  state: string;
  estimatedValue: string;
  emdAmount?: string;
  source: string;
  openingDate: string;
  closingDate: string;
  preBidDate?: string;
  description: string;
  eligibilityCriteria?: string;
  technicalSpecs?: string;
  paymentTerms?: string;
  portalUrl?: string;
}

/**
 * Fetch live tenders from GeM (Government e-Marketplace)
 * Uses multiple strategies to extract real tender data
 */
export async function fetchGeMMenders(filters?: {
  category?: string;
  state?: string;
  minValue?: number;
  maxValue?: number;
}): Promise<TenderData[]> {
  try {
    logger.info({ filters }, 'Fetching live tenders from GeM');

    // Strategy 1: Try GeM JSON API endpoint
    const jsonTenders = await tryGeMJsonAPI(filters);
    if (jsonTenders.length > 0) {
      logger.info({ count: jsonTenders.length }, 'Successfully fetched live tenders from GeM JSON API');
      return jsonTenders;
    }

    // Strategy 2: Try search API with parameters
    const searchTenders = await tryGeMSearchAPI(filters);
    if (searchTenders.length > 0) {
      logger.info({ count: searchTenders.length }, 'Successfully fetched tenders from GeM Search API');
      return searchTenders;
    }

    // Strategy 3: Try RSS feed
    const rssTenders = await tryGeMRSSFeed(filters);
    if (rssTenders.length > 0) {
      logger.info({ count: rssTenders.length }, 'Successfully fetched tenders from GeM RSS');
      return rssTenders;
    }

    // Strategy 4: Try public listings page with scraping
    const scrapedTenders = await tryGeMPublicListings(filters);
    if (scrapedTenders.length > 0) {
      logger.info({ count: scrapedTenders.length }, 'Successfully scraped tenders from GeM public listings');
      return scrapedTenders;
    }

    logger.warn('Could not fetch live tenders from GeM - all strategies failed');
    return [];

  } catch (error) {
    logger.error({ error }, 'Error fetching live GeM tenders');
    return [];
  }
}

/**
 * Fetch live tenders from CPPP (Central Public Procurement Portal)
 * eProcure is the main government tender portal
 */
export async function fetchCPPPTenders(filters?: {
  category?: string;
  state?: string;
  minValue?: number;
  maxValue?: number;
}): Promise<TenderData[]> {
  try {
    logger.info({ filters }, 'Fetching live tenders from CPPP/eProcure');

    // Strategy 1: Try eProcure JSON API
    const jsonTenders = await tryEProcureJsonAPI(filters);
    if (jsonTenders.length > 0) {
      logger.info({ count: jsonTenders.length }, 'Successfully fetched live tenders from eProcure JSON API');
      return jsonTenders;
    }

    // Strategy 2: Try eProcure search endpoint
    const searchTenders = await tryEProcureSearchAPI(filters);
    if (searchTenders.length > 0) {
      logger.info({ count: searchTenders.length }, 'Successfully fetched tenders from eProcure Search API');
      return searchTenders;
    }

    // Strategy 3: Try RSS feed
    const rssTenders = await tryEProcureRSSFeed(filters);
    if (rssTenders.length > 0) {
      logger.info({ count: rssTenders.length }, 'Successfully fetched tenders from eProcure RSS');
      return rssTenders;
    }

    // Strategy 4: Try eProcure public listings
    const scrapedTenders = await tryEProcurePublicListings(filters);
    if (scrapedTenders.length > 0) {
      logger.info({ count: scrapedTenders.length }, 'Successfully scraped tenders from eProcure listings');
      return scrapedTenders;
    }

    logger.warn('Could not fetch live tenders from CPPP/eProcure - all strategies failed');
    return [];

  } catch (error) {
    logger.error({ error }, 'Error fetching live CPPP tenders');
    return [];
  }
}

/**
 * Ingest tenders from multiple sources
 */
export async function ingestTendersFromSources(
  tenantId: number,
  sources: string[] = ['GeM', 'CPPP'],
  filters?: {
    category?: string;
    state?: string;
    minValue?: number;
    maxValue?: number;
  }
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  try {
    logger.info({ tenantId, sources }, 'Starting tender ingestion');

    let allTenders: TenderData[] = [];
    const errors: string[] = [];

    // Fetch from each source
    if (sources.includes('GeM')) {
      try {
        const gemTenders = await fetchGeMMenders(filters);
        allTenders = [...allTenders, ...gemTenders];
      } catch (error) {
        const msg = `GeM fetch failed: ${error.message}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    if (sources.includes('CPPP')) {
      try {
        const cpppTenders = await fetchCPPPTenders(filters);
        allTenders = [...allTenders, ...cpppTenders];
      } catch (error) {
        const msg = `CPPP fetch failed: ${error.message}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    // Deduplicate by reference number
    const uniqueTenders = Array.from(
      new Map(allTenders.map(t => [t.referenceNumber, t])).values()
    );

    let imported = 0;
    let skipped = 0;

    // Insert or update tenders in database
    for (const tender of uniqueTenders) {
      try {
        // Check if tender already exists
        const existing = await db.select()
          .from(tendersTable)
          .where(and(
            eq(tendersTable.tenantId, tenantId),
            eq(tendersTable.referenceNumber, tender.referenceNumber)
          ))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Insert new tender
        await db.insert(tendersTable).values({
          tenantId,
          title: tender.title,
          referenceNumber: tender.referenceNumber,
          authority: tender.authority,
          category: tender.category,
          state: tender.state,
          estimatedValue: tender.estimatedValue,
          emdAmount: tender.emdAmount,
          source: tender.source,
          openingDate: new Date(tender.openingDate),
          closingDate: new Date(tender.closingDate),
          preBidDate: tender.preBidDate ? new Date(tender.preBidDate) : null,
          description: tender.description,
          eligibilityCriteria: tender.eligibilityCriteria,
          technicalSpecs: tender.technicalSpecs,
          paymentTerms: tender.paymentTerms,
          portalUrl: tender.portalUrl,
          status: 'open'
        });

        imported++;
      } catch (error) {
        const msg = `Failed to insert tender ${tender.referenceNumber}: ${error.message}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    logger.info({ imported, skipped, errors: errors.length }, 'Tender ingestion completed');
    return { imported, skipped, errors };
  } catch (error) {
    logger.error({ error }, 'Tender ingestion failed');
    throw error;
  }
}

/**
 * GeM Helper Functions - Multiple strategies to fetch live tender data
 */

async function tryGeMJsonAPI(filters?: any): Promise<TenderData[]> {
  try {
    const response = await axios.get('https://gem.gov.in/api/v1/tenders', {
      timeout: 10000,
      params: {
        limit: 100,
        offset: 0,
        category: filters?.category,
        state: filters?.state
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    if (response.data?.tenders) return parseGeMTenders(response.data.tenders);
    if (response.data?.data?.tenders) return parseGeMTenders(response.data.data.tenders);
    if (Array.isArray(response.data)) return parseGeMTenders(response.data);
    return [];
  } catch (error) {
    logger.debug({ error: (error as any).code }, 'GeM JSON API failed');
    return [];
  }
}

async function tryGeMSearchAPI(filters?: any): Promise<TenderData[]> {
  try {
    const response = await axios.post('https://gem.gov.in/api/search', {
      keyword: filters?.category || 'tender',
      limit: 100,
      type: 'tenders'
    }, {
      timeout: 10000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    if (response.data?.results) return parseGeMTenders(response.data.results);
    if (response.data?.tenders) return parseGeMTenders(response.data.tenders);
    return [];
  } catch (error) {
    logger.debug({ error: (error as any).code }, 'GeM Search API failed');
    return [];
  }
}

async function tryGeMRSSFeed(filters?: any): Promise<TenderData[]> {
  try {
    const response = await axios.get('https://gem.gov.in/feed', {
      timeout: 10000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const tenders: TenderData[] = [];

    $('item').each((index, element) => {
      if (tenders.length >= 50) return false;
      const title = $(element).find('title').text();
      const description = $(element).find('description').text();
      const link = $(element).find('link').text();
      const pubDate = $(element).find('pubDate').text();

      if (title && link) {
        tenders.push({
          title: title.substring(0, 200),
          referenceNumber: extractRefNumber(title) || `GEM-${Date.now()}-${index}`,
          authority: 'Government of India',
          category: filters?.category || 'General',
          state: filters?.state || 'India',
          estimatedValue: '0',
          source: 'GeM',
          openingDate: new Date().toISOString().split('T')[0],
          closingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: description.substring(0, 500),
          portalUrl: link
        });
      }
    });

    return tenders;
  } catch (error) {
    logger.debug({ error: (error as any).code }, 'GeM RSS feed failed');
    return [];
  }
}

async function tryGeMPublicListings(filters?: any): Promise<TenderData[]> {
  try {
    const response = await axios.get('https://gem.gov.in/searchresult/query/', {
      timeout: 15000,
      params: {
        keyword: filters?.category || 'tender',
        page: 0
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    const $ = cheerio.load(response.data);
    const tenders: TenderData[] = [];

    // Try to parse table rows
    $('tr').each((index, element) => {
      if (tenders.length >= 50) return false;
      const cells = $(element).find('td');
      if (cells.length >= 3) {
        const title = cells.eq(1).text().trim();
        const refNumber = cells.eq(0).text().trim();
        const authority = cells.eq(2).text().trim();

        if (title && refNumber) {
          tenders.push({
            title,
            referenceNumber: refNumber,
            authority: authority || 'Government of India',
            category: filters?.category || 'General',
            state: filters?.state || 'India',
            estimatedValue: '0',
            source: 'GeM',
            openingDate: new Date().toISOString().split('T')[0],
            closingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Tender from GeM',
            portalUrl: `https://gem.gov.in/tenders/${refNumber}`
          });
        }
      }
    });

    return tenders;
  } catch (error) {
    logger.debug({ error: (error as any).code }, 'GeM public listings scraping failed');
    return [];
  }
}

/**
 * eProcure/CPPP Helper Functions
 */

async function tryEProcureJsonAPI(filters?: any): Promise<TenderData[]> {
  try {
    const response = await axios.get('https://eprocure.gov.in/api/tenders', {
      timeout: 10000,
      params: {
        limit: 100,
        offset: 0,
        category: filters?.category
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    if (response.data?.tenders) return parseEProcureTenders(response.data.tenders);
    if (response.data?.data?.tenders) return parseEProcureTenders(response.data.data.tenders);
    if (Array.isArray(response.data)) return parseEProcureTenders(response.data);
    return [];
  } catch (error) {
    logger.debug({ error: (error as any).code }, 'eProcure JSON API failed');
    return [];
  }
}

async function tryEProcureSearchAPI(filters?: any): Promise<TenderData[]> {
  try {
    const response = await axios.post('https://eprocure.gov.in/cppp/tenders/search', {
      keyword: filters?.category || 'tender',
      limit: 100
    }, {
      timeout: 10000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    if (response.data?.results) return parseEProcureTenders(response.data.results);
    if (response.data?.tenders) return parseEProcureTenders(response.data.tenders);
    return [];
  } catch (error) {
    logger.debug({ error: (error as any).code }, 'eProcure Search API failed');
    return [];
  }
}

async function tryEProcureRSSFeed(filters?: any): Promise<TenderData[]> {
  try {
    const response = await axios.get('https://eprocure.gov.in/feed.rss', {
      timeout: 10000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const tenders: TenderData[] = [];

    $('item').each((index, element) => {
      if (tenders.length >= 50) return false;
      const title = $(element).find('title').text();
      const description = $(element).find('description').text();
      const link = $(element).find('link').text();

      if (title && link) {
        tenders.push({
          title: title.substring(0, 200),
          referenceNumber: extractRefNumber(title) || `CPPP-${Date.now()}-${index}`,
          authority: 'Government of India',
          category: filters?.category || 'General',
          state: filters?.state || 'India',
          estimatedValue: '0',
          source: 'CPPP',
          openingDate: new Date().toISOString().split('T')[0],
          closingDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: description.substring(0, 500),
          portalUrl: link
        });
      }
    });

    return tenders;
  } catch (error) {
    logger.debug({ error: (error as any).code }, 'eProcure RSS feed failed');
    return [];
  }
}

async function tryEProcurePublicListings(filters?: any): Promise<TenderData[]> {
  try {
    const response = await axios.get('https://eprocure.gov.in/cppp/searchbyorg/', {
      timeout: 15000,
      params: {
        keyword: filters?.category || 'tender'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });

    const $ = cheerio.load(response.data);
    const tenders: TenderData[] = [];

    // Try to parse table rows
    $('tr').each((index, element) => {
      if (tenders.length >= 50) return false;
      const cells = $(element).find('td');
      if (cells.length >= 2) {
        const title = cells.eq(0).text().trim();
        const authority = cells.eq(1).text().trim();

        if (title && title.length > 10) {
          tenders.push({
            title: title.substring(0, 200),
            referenceNumber: extractRefNumber(title) || `CPPP-${Date.now()}-${index}`,
            authority: authority || 'Government of India',
            category: filters?.category || 'General',
            state: filters?.state || 'India',
            estimatedValue: '0',
            source: 'CPPP',
            openingDate: new Date().toISOString().split('T')[0],
            closingDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Tender from eProcure/CPPP',
            portalUrl: 'https://eprocure.gov.in/cppp/'
          });
        }
      }
    });

    return tenders;
  } catch (error) {
    logger.debug({ error: (error as any).code }, 'eProcure listings scraping failed');
    return [];
  }
}

/**
 * Parse GeM tender data from various formats
 */
function parseGeMTenders(rawTenders: any[]): TenderData[] {
  if (!Array.isArray(rawTenders)) return [];

  return rawTenders.slice(0, 50).map((item: any) => ({
    title: item.title || item.tenderTitle || item.name || '',
    referenceNumber: item.referenceNumber || item.tenderNumber || item.id || '',
    authority: item.authority || item.organizationName || item.publisherName || 'Government of India',
    category: item.category || item.categoryName || 'General',
    state: item.state || item.location || item.region || 'India',
    estimatedValue: String(item.estimatedValue || item.value || 0),
    emdAmount: String(item.emdAmount || item.earnestMoney || 0),
    source: 'GeM',
    openingDate: item.openingDate || item.publishDate || new Date().toISOString().split('T')[0],
    closingDate: item.closingDate || item.bidDeadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    preBidDate: item.preBidDate || item.preQualificationDate,
    description: item.description || item.summary || '',
    eligibilityCriteria: item.eligibilityCriteria || item.criteria || '',
    technicalSpecs: item.technicalSpecs || item.specifications || '',
    paymentTerms: item.paymentTerms || '',
    portalUrl: item.portalUrl || item.tenderUrl || item.url || `https://gem.gov.in/tenders/${item.id}`
  })).filter(t => t.title && t.referenceNumber);
}

/**
 * Parse eProcure tender data
 */
function parseEProcureTenders(rawTenders: any[]): TenderData[] {
  if (!Array.isArray(rawTenders)) return [];

  return rawTenders.slice(0, 50).map((item: any) => ({
    title: item.title || item.tenderTitle || item.name || '',
    referenceNumber: item.referenceNumber || item.tenderNumber || item.id || '',
    authority: item.authority || item.ministryName || item.ministry || 'Government of India',
    category: item.category || item.categoryName || 'Civil Works',
    state: item.state || item.location || item.region || 'India',
    estimatedValue: String(item.estimatedValue || item.projectValue || item.value || 0),
    emdAmount: String(item.emdAmount || item.earnestMoney || 0),
    source: 'CPPP',
    openingDate: item.openingDate || item.publishDate || new Date().toISOString().split('T')[0],
    closingDate: item.closingDate || item.bidDeadline || new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    preBidDate: item.preBidDate || item.preQualificationDate,
    description: item.description || item.objective || item.summary || '',
    eligibilityCriteria: item.eligibilityCriteria || item.criteria || '',
    technicalSpecs: item.technicalSpecs || item.specifications || '',
    paymentTerms: item.paymentTerms || '',
    portalUrl: item.portalUrl || item.tenderUrl || item.url || 'https://eprocure.gov.in/cppp/'
  })).filter(t => t.title && t.referenceNumber);
}

/**
 * Extract reference number from text
 */
function extractRefNumber(text: string): string | null {
  const match = text.match(/[A-Z]+\/\d{4}\/\d{4,6}|[A-Z]+-\d{4,6}|TEN-\d{6,8}/);
  return match ? match[0] : null;
}

/**
 * Generate enhanced mock GeM tenders with realistic data
 */
function generateEnhancedGeMMockTenders(filters?: {
  category?: string;
  state?: string;
  minValue?: number;
  maxValue?: number;
}): TenderData[] {
  const categories = [
    'IT Hardware & Software',
    'Office Equipment',
    'Construction Materials',
    'Medical Equipment',
    'Vehicles',
    'Furniture',
    'Electrical Items',
    'Networking Equipment'
  ];

  const states = [
    'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh',
    'Gujarat', 'Rajasthan', 'Punjab', 'Haryana', 'West Bengal'
  ];

  const authorities = [
    'Ministry of Defence',
    'Ministry of Health & Family Welfare',
    'Ministry of Education',
    'Ministry of Home Affairs',
    'Ministry of Rural Development',
    'Ministry of Agriculture',
    'Indian Railways',
    'Public Works Department',
    'Municipal Corporation',
    'Central Government Hospitals'
  ];

  const descriptions = [
    'Procurement of high-quality equipment for government operations',
    'Supply and installation of advanced technology solutions',
    'Tender for construction and infrastructure development',
    'Acquisition of medical and healthcare supplies',
    'Vehicle procurement for official government use',
    'Furniture and fixtures for government offices',
    'Electrical and power supply equipment',
    'IT infrastructure and networking solutions'
  ];

  return Array.from({ length: 25 }, (_, i) => {
    const category = filters?.category || categories[i % categories.length];
    const state = filters?.state || states[i % states.length];
    const authority = authorities[i % authorities.length];
    const baseValue = Math.floor(Math.random() * 5000000) + 100000; // 100K to 5M
    const estimatedValue = filters?.minValue && baseValue < filters.minValue ? filters.minValue + Math.random() * 1000000 :
                          filters?.maxValue && baseValue > filters.maxValue ? filters.maxValue - Math.random() * 500000 : baseValue;

    return {
      title: `${category} Procurement Tender ${2024}${String(i + 1).padStart(3, '0')}`,
      referenceNumber: `GEM/${new Date().getFullYear()}/${String(i + 1).padStart(4, '0')}`,
      authority,
      category,
      state,
      estimatedValue: String(Math.floor(estimatedValue)),
      emdAmount: String(Math.floor(estimatedValue * 0.02)), // 2% EMD
      source: 'GeM',
      openingDate: new Date().toISOString().split('T')[0],
      closingDate: new Date(Date.now() + (7 + Math.floor(Math.random() * 21)) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      preBidDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: descriptions[i % descriptions.length],
      eligibilityCriteria: 'GST registered firms with relevant experience and financial capability',
      technicalSpecs: 'As per detailed specifications in tender document',
      paymentTerms: '30% advance, 70% on delivery',
      portalUrl: `https://gem.gov.in/tenders/GEM-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`
    };
  });
}

/**
 * Generate enhanced mock CPPP tenders with realistic data
 */
function generateEnhancedCPPPMockTenders(filters?: {
  category?: string;
  state?: string;
  minValue?: number;
  maxValue?: number;
}): TenderData[] {
  const categories = [
    'Civil Construction',
    'Road Development',
    'Building Maintenance',
    'Infrastructure Projects',
    'Water Supply Systems',
    'Electrical Works',
    'HVAC Systems',
    'Consultancy Services'
  ];

  const states = [
    'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh',
    'Gujarat', 'Rajasthan', 'Punjab', 'Haryana', 'West Bengal'
  ];

  const ministries = [
    'Ministry of Road Transport & Highways',
    'Ministry of Housing & Urban Affairs',
    'Ministry of Water Resources',
    'Ministry of Power',
    'Ministry of New & Renewable Energy',
    'Public Works Department',
    'Municipal Corporations',
    'State Government Departments',
    'Railway Projects',
    'Port Authorities'
  ];

  const descriptions = [
    'Large-scale infrastructure development project',
    'Civil engineering and construction works',
    'Maintenance and repair of public infrastructure',
    'Development of transportation networks',
    'Water management and supply systems',
    'Electrical infrastructure upgrades',
    'Consultancy for project planning and execution',
    'Environmental impact assessment services'
  ];

  return Array.from({ length: 20 }, (_, i) => {
    const category = filters?.category || categories[i % categories.length];
    const state = filters?.state || states[i % states.length];
    const authority = ministries[i % ministries.length];
    const baseValue = Math.floor(Math.random() * 50000000) + 1000000; // 1M to 50M
    const estimatedValue = filters?.minValue && baseValue < filters.minValue ? filters.minValue + Math.random() * 10000000 :
                          filters?.maxValue && baseValue > filters.maxValue ? filters.maxValue - Math.random() * 5000000 : baseValue;

    return {
      title: `${category} Project - ${state} ${2024}${String(i + 1).padStart(3, '0')}`,
      referenceNumber: `CPPP/${new Date().getFullYear()}/${String(i + 1).padStart(4, '0')}`,
      authority,
      category,
      state,
      estimatedValue: String(Math.floor(estimatedValue)),
      emdAmount: String(Math.floor(estimatedValue * 0.05)), // 5% EMD
      source: 'CPPP',
      openingDate: new Date().toISOString().split('T')[0],
      closingDate: new Date(Date.now() + (14 + Math.floor(Math.random() * 30)) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      preBidDate: new Date(Date.now() + (7 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: descriptions[i % descriptions.length],
      eligibilityCriteria: 'Class A contractors with relevant experience and financial capability',
      technicalSpecs: 'Detailed specifications available in tender documents',
      paymentTerms: '20% advance, balance in milestones',
      portalUrl: `https://eprocure.gov.in/cppp/tenders/CPPP-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`
    };
  });
}
