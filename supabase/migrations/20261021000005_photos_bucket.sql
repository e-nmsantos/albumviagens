-- Private bucket for memory and itinerary photos (files live under <user_id>/).
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;
