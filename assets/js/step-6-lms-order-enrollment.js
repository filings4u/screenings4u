/* =========================================================
   screenings4u LMS — STEP 6
   Order -> LMS Enrollment Bridge
   =========================================================
   PURPOSE
   -------
   Creates an LMS enrollment from a paid order item whose product
   points to an LMS course through products.training_course_id.

   The database triggers on orders/order_items should remain the
   authoritative automatic path. This browser-side bridge is an
   explicit, idempotent helper for checkout/order-success flows and
   for repairing a paid order that did not create its enrollment.

   URL:
      step-6-lms-order-enrollment.js?order=ORDER_ID

   Or call:
      window.Screenings4uLMSOrderEnrollment.ensureFromOrder(orderId)
*/
(() => {
  'use strict';

  const TABLES = {
    orders: 'orders',
    orderItems: 'order_items',
    products: 'products',
    enrollments: 'lms_enrollments'
  };

  function db() {
    const client = [
      window.supabaseClient,
      window.supabaseAdmin,
      window.supabase,
      window.screenings4uSupabase
    ].find(value => value && typeof value.from === 'function');

    if (!client) {
      throw new Error('Supabase client was not found.');
    }

    return client;
  }

  async function requireUser() {
    const { data, error } = await db().auth.getUser();
    if (error) throw error;
    if (!data?.user) {
      throw new Error('You must be signed in to create an LMS enrollment.');
    }
    return data.user;
  }

  function getOrderId() {
    const params = new URLSearchParams(location.search);
    return params.get('order') || params.get('order_id') || '';
  }

  async function loadPaidTrainingItems(orderId, userId) {
    const { data, error } = await db()
      .from(TABLES.orders)
      .select(`
        id,
        user_id,
        payment_status,
        status,
        order_items(
          id,
          order_id,
          quantity,
          product_id,
          products(
            id,
            name,
            training_course_id,
            is_active
          )
        )
      `)
      .eq('id', orderId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Order was not found.');
    if (data.payment_status !== 'paid') {
      throw new Error('The order has not been paid.');
    }

    const items = (data.order_items || []).filter(item =>
      item.products?.training_course_id &&
      item.products?.is_active !== false
    );

    return { order: data, items };
  }

  async function ensureEnrollment(orderId) {
    if (!orderId) throw new Error('No order ID was provided.');

    const user = await requireUser();
    const { items } = await loadPaidTrainingItems(orderId, user.id);

    const results = [];

    for (const item of items) {
      const courseId = item.products.training_course_id;

      const { data: existing, error: existingError } = await db()
        .from(TABLES.enrollments)
        .select(`
          id,
          user_id,
          course_id,
          order_item_id,
          status,
          progress_percent,
          enrolled_at,
          started_at,
          completed_at
        `)
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        results.push({
          created: false,
          enrollment: existing,
          orderItemId: item.id
        });
        continue;
      }

      const { data: enrollment, error: insertError } = await db()
        .from(TABLES.enrollments)
        .insert({
          user_id: user.id,
          course_id: courseId,
          order_item_id: item.id,
          status: 'active',
          progress_percent: 0
        })
        .select(`
          id,
          user_id,
          course_id,
          order_item_id,
          status,
          progress_percent,
          enrolled_at,
          started_at,
          completed_at
        `)
        .single();

      if (insertError) {
        /*
          A database trigger may have created the enrollment between
          the existence check and this insert. Re-read it rather than
          treating that race as a hard failure.
        */
        if (insertError.code === '23505') {
          const { data: raced, error: raceError } = await db()
            .from(TABLES.enrollments)
            .select(`
              id,
              user_id,
              course_id,
              order_item_id,
              status,
              progress_percent,
              enrolled_at,
              started_at,
              completed_at
            `)
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single();

          if (raceError) throw raceError;

          results.push({
            created: false,
            enrollment: raced,
            orderItemId: item.id
          });
          continue;
        }

        throw insertError;
      }

      results.push({
        created: true,
        enrollment,
        orderItemId: item.id
      });
    }

    return results;
  }

  async function init() {
    const orderId = getOrderId();
    if (!orderId) return;

    try {
      const results = await ensureEnrollment(orderId);
      document.dispatchEvent(new CustomEvent(
        'screenings4u:lms-enrollment-ready',
        { detail: { orderId, results } }
      ));
      return results;
    } catch (error) {
      console.error('LMS enrollment bridge failed:', error);
      document.dispatchEvent(new CustomEvent(
        'screenings4u:lms-enrollment-error',
        { detail: { orderId, error } }
      ));
      return null;
    }
  }

  window.Screenings4uLMSOrderEnrollment = {
    ensureFromOrder: ensureEnrollment,
    init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();