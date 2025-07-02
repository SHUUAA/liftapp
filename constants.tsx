

import React from 'react';
import { Exam, AnnotationColumn } from './types';

// Placeholder SVGs for UI elements (Heroicons or similar would be good for a real app)
// Using simpler versions for now.

const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2Z" />
  </svg>
);

const HeartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);


const CollectionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( // Will be used for Confirmation
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( // Will be used for Burial
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10.5 11.25h3M12 15V3.75m0 0H8.25m3.75 0h3.75M3.75 7.5h16.5M12 7.5V3.75" />
  </svg>
);

export const EXAM_DURATION_SECONDS = 40 * 60; // 40 minutes

export const EXAMS_DATA: Exam[] = [
  {
    id: 'baptism',
    name: 'Baptism',
    description: 'Annotate historical baptismal records. Capture names, dates, and family relations.',
    icon: <DocumentTextIcon className="w-12 h-12 text-sky-600" />,
  },
  {
    id: 'marriage',
    name: 'Marriage',
    description: 'Transcribe marriage records. Note details of spouses, witnesses, and ceremony dates.',
    icon: <HeartIcon className="w-12 h-12 text-rose-500" />,
  },
  {
    id: 'confirmation',
    name: 'Confirmation',
    description: 'Extract information from confirmation registers, including names, sponsors, and dates.',
    icon: <CollectionIcon className="w-12 h-12 text-amber-500" />, // Reusing CollectionIcon
  },
  {
    id: 'burial',
    name: 'Burial',
    description: 'Annotate burial records, capturing details of the deceased, death dates, and burial locations.',
    icon: <ArchiveBoxIcon className="w-12 h-12 text-slate-500" />, // Reusing ArchiveBoxIcon
  },
];

export const DEFAULT_ANNOTATION_TABLE_COLUMNS: AnnotationColumn[] = [
  { id: 'image_ref', label: 'Image', type: 'text', width: 'w-40' },
  { id: 'language', label: 'Language', type: 'text', width: 'w-24' },
  { id: 'event_d', label: 'Event_D', type: 'text', width: 'w-20' },
  { id: 'event_m', label: 'Event_M', type: 'text', width: 'w-20' },
  { id: 'event_y', label: 'Event_Y', type: 'text', width: 'w-24' },
  { id: 'given', label: 'Given', type: 'text', width: 'w-36' },
  { id: 'surname', label: 'Surname', type: 'text', width: 'w-36' },
  { id: 'age', label: 'Age', type: 'text', width: 'w-20' },
  { id: 'sex', label: 'Sex', type: 'text', width: 'w-16' },
  { id: 'birth_d', label: 'Birth_D', type: 'text', width: 'w-20' },
  { id: 'birth_m', label: 'Birth_M', type: 'text', width: 'w-20' },
  { id: 'birth_y', label: 'Birth_Y', type: 'text', width: 'w-24' },
  { id: 'fa_given', label: 'Fa_Given', type: 'text', width: 'w-36' },
  { id: 'fa_surname', label: 'Fa_Surname', type: 'text', width: 'w-36' },
  { id: 'mo_given', label: 'Mo_Given', type: 'text', width: 'w-36' },
  { id: 'mo_surname', label: 'Mo_Surname', type: 'text', width: 'w-36' },
  { id: 'sp_given', label: 'Sp_Given', type: 'text', width: 'w-36' },
  { id: 'sp_surname', label: 'Sp_Surname', type: 'text', width: 'w-36' },
  { id: 'sp_age', label: 'Sp_Age', type: 'text', width: 'w-20' },
  { id: 'sp_birth_y', label: 'Sp_Birth_Y', type: 'text', width: 'w-24' },
  { id: 'sp_fa_given', label: 'Sp_Fa_Given', type: 'text', width: 'w-36' },
  { id: 'sp_fa_surname', label: 'Sp_Fa_Surname', type: 'text', width: 'w-36' },
  { id: 'sp_mo_given', label: 'Sp_Mo_Given', type: 'text', width: 'w-36' },
  { id: 'sp_mo_surname', label: 'Sp_Mo_Surname', type: 'text', width: 'w-36' },
];

const BURIAL_ANNOTATION_TABLE_COLUMNS: AnnotationColumn[] = [
  { id: 'image_ref', label: 'Image', type: 'text', width: 'w-40' },
  { id: 'language', label: 'Language', type: 'text', width: 'w-24' },
  { id: 'event_d', label: 'Event_D', type: 'text', width: 'w-20' },
  { id: 'event_m', label: 'Event_M', type: 'text', width: 'w-20' },
  { id: 'event_y', label: 'Event_Y', type: 'text', width: 'w-24' },
  { id: 'given', label: 'Given', type: 'text', width: 'w-36' },
  { id: 'surname', label: 'Surname', type: 'text', width: 'w-36' },
  { id: 'age', label: 'Age', type: 'text', width: 'w-20' },
  { id: 'sex', label: 'Sex', type: 'text', width: 'w-16' },
  { id: 'death_d', label: 'Death_D', type: 'text', width: 'w-20' },
  { id: 'death_m', label: 'Death_M', type: 'text', width: 'w-20' },
  { id: 'death_y', label: 'Death_Y', type: 'text', width: 'w-24' },
  { id: 'fa_given', label: 'Fa_Given', type: 'text', width: 'w-36' },
  { id: 'fa_surname', label: 'Fa_Surname', type: 'text', width: 'w-36' },
  { id: 'mo_given', label: 'Mo_Given', type: 'text', width: 'w-36' },
  { id: 'mo_surname', label: 'Mo_Surname', type: 'text', width: 'w-36' },
  { id: 'sp_given', label: 'Sp_Given', type: 'text', width: 'w-36' },
  { id: 'sp_surname', label: 'Sp_Surname', type: 'text', width: 'w-36' },
];

export const getColumnsForExam = (examCode: string): AnnotationColumn[] => {
  if (examCode === 'burial') {
    return BURIAL_ANNOTATION_TABLE_COLUMNS;
  }
  return DEFAULT_ANNOTATION_TABLE_COLUMNS;
};


export const STORAGE_BUCKET_NAME = 'exam-images';
