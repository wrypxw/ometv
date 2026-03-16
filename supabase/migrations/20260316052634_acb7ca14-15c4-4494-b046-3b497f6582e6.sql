CREATE OR REPLACE FUNCTION public.transfer_gift_coins(_sender_id uuid, _receiver_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_coins integer;
  receiver_exists boolean;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _sender_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _amount IS NULL OR _amount <= 0 OR _sender_id IS NULL OR _receiver_id IS NULL OR _sender_id = _receiver_id THEN
    RETURN false;
  END IF;

  SELECT coins INTO sender_coins
  FROM public.profiles
  WHERE id = _sender_id
  FOR UPDATE;

  IF sender_coins IS NULL OR sender_coins < _amount THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = _receiver_id
  ) INTO receiver_exists;

  IF NOT receiver_exists THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET coins = coins - _amount,
      updated_at = now()
  WHERE id = _sender_id;

  UPDATE public.profiles
  SET coins = coins + _amount,
      updated_at = now()
  WHERE id = _receiver_id;

  RETURN true;
END;
$$;