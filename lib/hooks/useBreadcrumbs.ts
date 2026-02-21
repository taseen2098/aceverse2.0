'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

const isUUID = (str: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

const fetchOrgName = async (orgId: string) => {
  const { data, error } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();
  if (error) throw new Error('Failed to fetch organization name');
  return data?.name || orgId;
};

const fetchExamName = async (examId: string) => {
    const { data, error } = await supabase
      .from('exams')
      .select('title')
      .eq('id', examId)
      .single();
    if (error) throw new Error('Failed to fetch exam name');
    return data?.title || examId;
  };

export function useBreadcrumbs() {
  const pathname = usePathname();
  const pathSegments = useMemo(() => pathname.split('/').filter(Boolean), [pathname]);

  const breadcrumbs = useMemo(() => {
    const crumbs = [{ href: '/', title: 'Home' }];

    let currentPath = '';
    for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        currentPath += `/${segment}`;

        let title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

        if(isUUID(segment)) {
            // This is a dynamic part, we'll replace it later
            title = '...'; 
        } else if (segment.toLowerCase() === 'org' && (i === pathSegments.length - 1)) {
            // Special case for /org link
             crumbs.push({ href: '/teacher-dashboard', title: 'Organizations' });
             continue; // Skip the default push
        }
        
        crumbs.push({ href: currentPath, title });
    }
    return crumbs;

  }, [pathSegments]);

  // Now, we use react-query to fetch dynamic names
  const { data: orgName } = useQuery({
    queryKey: ['orgName', pathSegments[1]],
    queryFn: () => fetchOrgName(pathSegments[1]),
    enabled: pathSegments[0] === 'org' && pathSegments.length > 1 && isUUID(pathSegments[1]),
    staleTime: Infinity,
  });

  const { data: examName } = useQuery({
    queryKey: ['examName', pathSegments[3]],
    queryFn: () => fetchExamName(pathSegments[3]),
    enabled: pathSegments[2] === 'edit-exam' && pathSegments.length > 3 && isUUID(pathSegments[3]),
    staleTime: Infinity,
  });

  // Replace placeholder titles with fetched data
  const finalCrumbs = useMemo(() => {
    return breadcrumbs.map((crumb, i) => {
      // i=0 is Home. Segments start at i=1.
      if (i > 0) {
        const segment = pathSegments[i-1];
        if (isUUID(segment)) {
            if (i-1 === 1 && pathSegments[0] === 'org') { // orgId is at pathSegments[1]
                return { ...crumb, title: orgName || 'Organization' };
            }
            if (i-1 === 3 && pathSegments[2] === 'edit-exam') { // examId is at pathSegments[3]
                return { ...crumb, title: examName || 'Exam' };
            }
        }
      }
      return crumb;
    });
  }, [breadcrumbs, orgName, examName, pathSegments]);


  return finalCrumbs;
}
