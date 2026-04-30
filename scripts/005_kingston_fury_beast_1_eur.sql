-- Цена 1.00 EUR за Kingston Fury Beast DDR4 16GB 3200MHz
-- Изпълни в Supabase → SQL Editor (или psql). Провери с SELECT след UPDATE.

UPDATE components
SET price = 1.00
WHERE name ILIKE '%Kingston%Fury%Beast%DDR4%16GB%3200%'
   OR slug ILIKE '%kingston%fury%beast%ddr4%16gb%3200%'
   OR slug ILIKE '%kingston-fury-beast-ddr4-16gb-3200%';

-- Ако slug ползва различно изписване, виж редовете:
-- SELECT id, name, slug, price FROM components WHERE name ILIKE '%Kingston%Fury%Beast%';
