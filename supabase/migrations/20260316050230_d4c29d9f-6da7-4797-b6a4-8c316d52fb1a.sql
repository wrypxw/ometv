
CREATE OR REPLACE FUNCTION public.transfer_gift_coins(_sender_id uuid, _receiver_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_coins integer;
BEGIN
  -- Verify the caller is the sender
  IF auth.uid() != _sender_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Check sender has enough coins
  SELECT coins INTO sender_coins FROM public.profiles WHERE id = _sender_id FOR UPDATE;
  IF sender_coins IS NULL OR sender_coins < _amount THEN
    RETURN false;
  END IF;

  -- Deduct from sender
  UPDATE public.profiles SET coins = coins - _amount, updated_at = now() WHERE id = _sender_id;
  
  -- Credit to receiver
  UPDATE public.profiles SET coins = coins + _amount, updated_at = now() WHERE id = _receiver_id;

  RETURN true;
END;
$$;
