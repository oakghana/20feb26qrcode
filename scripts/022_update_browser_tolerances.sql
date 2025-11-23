-- Update default browser tolerance settings
-- Edge: 300m (better GPS accuracy)
-- All other browsers: 1000m (standard tolerance)

UPDATE system_settings
SET geo_settings = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(geo_settings, '{}'::jsonb),
            '{enableBrowserSpecificTolerance}',
            'true'::jsonb
          ),
          '{browserTolerances,edge}',
          '300'::jsonb
        ),
        '{browserTolerances,chrome}',
        '1000'::jsonb
      ),
      '{browserTolerances,firefox}',
      '1000'::jsonb
    ),
    '{browserTolerances,safari}',
    '1000'::jsonb
  ),
  '{browserTolerances,opera}',
  '1000'::jsonb
)
WHERE id = 1;

-- Verify the settings
SELECT 
  geo_settings->'enableBrowserSpecificTolerance' as browser_tolerance_enabled,
  geo_settings->'browserTolerances'->'edge' as edge_tolerance,
  geo_settings->'browserTolerances'->'chrome' as chrome_tolerance,
  geo_settings->'browserTolerances'->'firefox' as firefox_tolerance,
  geo_settings->'browserTolerances'->'safari' as safari_tolerance,
  geo_settings->'browserTolerances'->'opera' as opera_tolerance
FROM system_settings 
WHERE id = 1;
