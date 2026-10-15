CREATE OR REPLACE FUNCTION update_shopping_list_item(
        p_trip_id uuid,
        p_item_id uuid,
        p_name text DEFAULT NULL,
        p_category "Category" DEFAULT NULL,
        p_unit "Unit" DEFAULT NULL,
        p_amount numeric DEFAULT NULL
    ) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_current shopping_list_history;
BEGIN -- Only changes the fields that wer
    UPDATE shopping_list_item
    SET name = COALESCE(p_name, name),
        category = COALESCE(p_category, category)
    WHERE id = p_item_id;
    
    IF p_unit IS NOT NULL OR p_amount IS NOT NULL THEN
        SELECT * INTO STRICT v_current
        FROM shopping_list_history
        WHERE trip_id = p_trip_id
            AND shopping_list_item_id = p_item_id
        ORDER BY valid_from DESC
        LIMIT 1;

        INSERT INTO shopping_list_history (
                trip_id,
                valid_from,
                shopping_list_item_id,
                unit,
                amount
            )
        VALUES (
                p_trip_id,
                now(),
                p_item_id,
                COALESCE(p_unit, v_current.unit),
                COALESCE(p_amount, v_current.amount)
            );
    END IF;
END;
$$;