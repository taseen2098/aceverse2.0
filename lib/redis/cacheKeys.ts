export const CacheKeys = {
  ExamsPerOrganization({ organization_id }: { organization_id: string }) {
    return `cache-exams:org_${organization_id}`;
  },
  ExamsPerBatches({
    organization_id,
    batchIds,
  }: {
    organization_id: string;
    batchIds: string[];
  }) {
    return batchIds.map(
      (batchId) => `cache-exams:org_${organization_id}:batch_${batchId}`,
    );
  },
};
