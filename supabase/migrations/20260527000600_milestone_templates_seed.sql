-- ============================================================
-- Default milestone templates per common trade.
-- One template per trade marked is_default=true. The client picks the default
-- on project create and inserts a project_milestones row per item in milestones[].
--
-- milestones jsonb shape per spec doc 02 §2.3:
--   [{ title: string, requires_approval?: boolean }]
-- ============================================================

-- Wipe + reinsert is safe because nothing references milestone_templates yet.
delete from milestone_templates where is_default is true;

insert into milestone_templates (trade_type, template_name, is_default, milestones)
values
  ('kitchen_fitter', 'Standard kitchen install', true, '[
    { "title": "Survey + measure" },
    { "title": "Strip out" },
    { "title": "First-fix plumbing" },
    { "title": "First-fix electrics" },
    { "title": "Plastering" },
    { "title": "Cabinets + worktops", "requires_approval": true },
    { "title": "Tiling + splashbacks" },
    { "title": "Second-fix plumbing" },
    { "title": "Second-fix electrics" },
    { "title": "Snagging + handover", "requires_approval": true }
  ]'::jsonb),

  ('bathroom_fitter', 'Standard bathroom install', true, '[
    { "title": "Survey + measure" },
    { "title": "Strip out" },
    { "title": "First-fix plumbing" },
    { "title": "Plastering" },
    { "title": "Tiling" },
    { "title": "Sanitaryware install" },
    { "title": "Second-fix electrics" },
    { "title": "Snagging + handover", "requires_approval": true }
  ]'::jsonb),

  ('electrician', 'Standard electrical job', true, '[
    { "title": "Site survey" },
    { "title": "Consumer unit / isolation" },
    { "title": "First-fix wiring" },
    { "title": "Second-fix accessories" },
    { "title": "Test + certify", "requires_approval": true }
  ]'::jsonb),

  ('plumber', 'Standard plumbing job', true, '[
    { "title": "Survey + isolate" },
    { "title": "First-fix pipework" },
    { "title": "Boiler / cylinder install" },
    { "title": "Second-fix fittings" },
    { "title": "Test + commission", "requires_approval": true }
  ]'::jsonb),

  ('builder', 'Extension / build', true, '[
    { "title": "Foundations" },
    { "title": "Brickwork + frame" },
    { "title": "Roof + weather-tight" },
    { "title": "First-fix" },
    { "title": "Plastering" },
    { "title": "Second-fix" },
    { "title": "Decoration + snagging", "requires_approval": true }
  ]'::jsonb),

  ('plasterer', 'Plastering job', true, '[
    { "title": "Prep + protection" },
    { "title": "First coat" },
    { "title": "Top coat + finishing" },
    { "title": "Cure + sign-off", "requires_approval": true }
  ]'::jsonb),

  ('painter_decorator', 'Decorating job', true, '[
    { "title": "Prep + masking" },
    { "title": "Undercoat" },
    { "title": "Top coats" },
    { "title": "Finishing + clean-up", "requires_approval": true }
  ]'::jsonb),

  ('general', 'General works', true, '[
    { "title": "Site visit" },
    { "title": "Materials on order" },
    { "title": "Work in progress" },
    { "title": "Snagging + handover", "requires_approval": true }
  ]'::jsonb);
