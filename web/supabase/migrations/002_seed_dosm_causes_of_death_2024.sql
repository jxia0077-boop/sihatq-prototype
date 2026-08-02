-- DOSM Causes of Death (2024 deaths, published in 2025 release)
-- Run AFTER 001_init.sql in Supabase SQL Editor.
-- Safe to re-run: deletes previous DOSM 2024 seed rows, then inserts again.
-- Does not change app pages; data is available for AI context / future features.

delete from public.health_reference_stats
where year = 2024
  and indicator in (
    'ischaemic_heart_diseases_principal_cause',
    'pneumonia_principal_cause',
    'diabetes_mellitus_principal_cause',
    'transport_accidents_principal_cause',
    'transport_accidents_age_15_40',
    'ischaemic_heart_diseases_age_41_59',
    'pneumonia_age_60_plus'
  );

insert into public.health_reference_stats
  (indicator, year, state, age_group, gender, value, unit, source_title, source_url)
values
  (
    'ischaemic_heart_diseases_principal_cause',
    2024,
    'Malaysia',
    'all',
    'all',
    13.0,
    'percent_of_medically_certified_deaths',
    'Statistics on Causes of Death, Malaysia, 2025',
    'https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025'
  ),
  (
    'pneumonia_principal_cause',
    2024,
    'Malaysia',
    'all',
    'all',
    11.5,
    'percent_of_medically_certified_deaths',
    'Statistics on Causes of Death, Malaysia, 2025',
    'https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025'
  ),
  (
    'diabetes_mellitus_principal_cause',
    2024,
    'Malaysia',
    'all',
    'all',
    5.2,
    'percent_of_medically_certified_deaths',
    'Statistics on Causes of Death, Malaysia, 2025',
    'https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025'
  ),
  (
    'transport_accidents_principal_cause',
    2024,
    'Malaysia',
    'all',
    'all',
    3.3,
    'percent_of_medically_certified_deaths',
    'Statistics on Causes of Death, Malaysia, 2025',
    'https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025'
  ),
  (
    'transport_accidents_age_15_40',
    2024,
    'Malaysia',
    '15-40',
    'all',
    20.0,
    'percent_of_age_group_medically_certified_deaths',
    'Statistics on Causes of Death, Malaysia, 2025',
    'https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025'
  ),
  (
    'ischaemic_heart_diseases_age_41_59',
    2024,
    'Malaysia',
    '41-59',
    'all',
    17.6,
    'percent_of_age_group_medically_certified_deaths',
    'Statistics on Causes of Death, Malaysia, 2025',
    'https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025'
  ),
  (
    'pneumonia_age_60_plus',
    2024,
    'Malaysia',
    '60+',
    'all',
    13.9,
    'percent_of_age_group_medically_certified_deaths',
    'Statistics on Causes of Death, Malaysia, 2025',
    'https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025'
  );
