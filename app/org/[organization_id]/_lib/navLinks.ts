import { Role } from '../../../../features/db-ts/objects';

export interface navLink {
  title: string;
  link: string;
}

export const studentLinks: navLink[] = []

export const staffLinks: navLink[] = []

export const adminLinks: navLink[] = []


export const getNavLinks = (role: Role) => {

  return {
    ...(role === "admin" ? adminLinks : {}),
    ...((role === "teacher" || role === "manager" || role === "owner") ? staffLinks : {}),
    ...(role === "student" ? studentLinks : {}),

  }
}