-- Create a default general channel for team communication
    INSERT INTO public.channels (name, description)
    VALUES ('general', 'General team discussion')
    ON CONFLICT DO NOTHING;
