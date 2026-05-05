REVOKE ALL ON FUNCTION public.process_razorpay_payment(uuid, uuid, text, text, text, integer, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_razorpay_payment(uuid, uuid, text, text, text, integer, text, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.process_razorpay_payment(uuid, uuid, text, text, text, integer, text, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_razorpay_payment(uuid, uuid, text, text, text, integer, text, text, integer) TO service_role;