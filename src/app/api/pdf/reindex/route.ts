import { NextResponse } from 'next/server';
import { auditAndSanitizeChunksDatabase } from '@/lib/pdfMigration';

export async function POST() {
  try {
    const report = auditAndSanitizeChunksDatabase();

    return NextResponse.json({
      success: true,
      message: `Database audited and sanitized. Purged ${report.corruptedRemoved} corrupted chunks. Retained ${report.verifiedRetained} verified chunks.`,
      report
    });
  } catch (error: any) {
    console.error('Error during database sanitization & reindex:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reindex database' },
      { status: 500 }
    );
  }
}
