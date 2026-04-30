-- Add newest NVIDIA 50 Series and AMD 9000 Series GPUs and CPUs

-- First, ensure we have the GPU and CPU category IDs
DO $$
DECLARE
    gpu_category_id UUID;
    cpu_category_id UUID;
    nvidia_brand_id UUID;
    amd_brand_id UUID;
    intel_brand_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO gpu_category_id FROM categories WHERE slug = 'gpu';
    SELECT id INTO cpu_category_id FROM categories WHERE slug = 'cpu';
    
    -- Get brand IDs (or create them)
    SELECT id INTO nvidia_brand_id FROM brands WHERE slug = 'nvidia';
    SELECT id INTO amd_brand_id FROM brands WHERE slug = 'amd';
    SELECT id INTO intel_brand_id FROM brands WHERE slug = 'intel';
    
    -- Insert NVIDIA brand if not exists
    IF nvidia_brand_id IS NULL THEN
        INSERT INTO brands (name, slug) VALUES ('NVIDIA', 'nvidia')
        RETURNING id INTO nvidia_brand_id;
    END IF;
    
    -- Insert AMD brand if not exists  
    IF amd_brand_id IS NULL THEN
        INSERT INTO brands (name, slug) VALUES ('AMD', 'amd')
        RETURNING id INTO amd_brand_id;
    END IF;
    
    -- Insert Intel brand if not exists
    IF intel_brand_id IS NULL THEN
        INSERT INTO brands (name, slug) VALUES ('Intel', 'intel')
        RETURNING id INTO intel_brand_id;
    END IF;

    -- ==========================================
    -- NVIDIA GeForce RTX 50 Series GPUs (2025)
    -- ==========================================
    
    -- RTX 5090
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'NVIDIA GeForce RTX 5090 Founders Edition',
        'RTX 5090',
        gpu_category_id,
        nvidia_brand_id,
        2199.00,
        4.9,
        156,
        true,
        '{"vram": 32, "vram_type": "GDDR7", "boost_clock": 2900, "cuda_cores": 21760, "tdp": 575, "chipset_maker": "NVIDIA", "ray_tracing": true, "dlss": "4.0"}'::jsonb,
        'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- RTX 5080
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'NVIDIA GeForce RTX 5080 Founders Edition',
        'RTX 5080',
        gpu_category_id,
        nvidia_brand_id,
        1099.00,
        4.8,
        234,
        true,
        '{"vram": 16, "vram_type": "GDDR7", "boost_clock": 2700, "cuda_cores": 10752, "tdp": 360, "chipset_maker": "NVIDIA", "ray_tracing": true, "dlss": "4.0"}'::jsonb,
        'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- RTX 5070 Ti
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'NVIDIA GeForce RTX 5070 Ti Founders Edition',
        'RTX 5070 Ti',
        gpu_category_id,
        nvidia_brand_id,
        849.00,
        4.7,
        189,
        true,
        '{"vram": 16, "vram_type": "GDDR7", "boost_clock": 2600, "cuda_cores": 8960, "tdp": 300, "chipset_maker": "NVIDIA", "ray_tracing": true, "dlss": "4.0"}'::jsonb,
        'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- RTX 5070
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'NVIDIA GeForce RTX 5070 Founders Edition',
        'RTX 5070',
        gpu_category_id,
        nvidia_brand_id,
        599.00,
        4.7,
        312,
        true,
        '{"vram": 12, "vram_type": "GDDR7", "boost_clock": 2500, "cuda_cores": 6144, "tdp": 220, "chipset_maker": "NVIDIA", "ray_tracing": true, "dlss": "4.0"}'::jsonb,
        'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- AMD Radeon RX 9000 Series GPUs (2025)
    -- ==========================================
    
    -- RX 9070 XT
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'AMD Radeon RX 9070 XT',
        'RX 9070 XT',
        gpu_category_id,
        amd_brand_id,
        649.00,
        4.6,
        145,
        true,
        '{"vram": 16, "vram_type": "GDDR6", "boost_clock": 2800, "stream_processors": 4608, "tdp": 280, "chipset_maker": "AMD", "ray_tracing": true, "fsr": "4.0"}'::jsonb,
        'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- RX 9070
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'AMD Radeon RX 9070',
        'RX 9070',
        gpu_category_id,
        amd_brand_id,
        499.00,
        4.5,
        178,
        true,
        '{"vram": 12, "vram_type": "GDDR6", "boost_clock": 2600, "stream_processors": 3584, "tdp": 220, "chipset_maker": "AMD", "ray_tracing": true, "fsr": "4.0"}'::jsonb,
        'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- AMD Ryzen 9000 Series CPUs (2024-2025)
    -- ==========================================
    
    -- Ryzen 9 9950X
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'AMD Ryzen 9 9950X',
        'Ryzen 9 9950X',
        cpu_category_id,
        amd_brand_id,
        649.00,
        4.9,
        234,
        true,
        '{"cores": 16, "threads": 32, "base_clock": 4.3, "boost_clock": 5.7, "cache": 80, "tdp": 170, "socket": "AM5", "architecture": "Zen 5"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- Ryzen 9 9900X
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'AMD Ryzen 9 9900X',
        'Ryzen 9 9900X',
        cpu_category_id,
        amd_brand_id,
        499.00,
        4.8,
        312,
        true,
        '{"cores": 12, "threads": 24, "base_clock": 4.4, "boost_clock": 5.6, "cache": 76, "tdp": 120, "socket": "AM5", "architecture": "Zen 5"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- Ryzen 7 9700X
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'AMD Ryzen 7 9700X',
        'Ryzen 7 9700X',
        cpu_category_id,
        amd_brand_id,
        359.00,
        4.7,
        456,
        true,
        '{"cores": 8, "threads": 16, "base_clock": 3.8, "boost_clock": 5.5, "cache": 40, "tdp": 65, "socket": "AM5", "architecture": "Zen 5"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- Ryzen 5 9600X
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'AMD Ryzen 5 9600X',
        'Ryzen 5 9600X',
        cpu_category_id,
        amd_brand_id,
        279.00,
        4.7,
        589,
        true,
        '{"cores": 6, "threads": 12, "base_clock": 3.9, "boost_clock": 5.4, "cache": 38, "tdp": 65, "socket": "AM5", "architecture": "Zen 5"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- Intel Core Ultra 200 Series (Arrow Lake) 2024-2025
    -- ==========================================
    
    -- Core Ultra 9 285K
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core Ultra 9 285K',
        'Core Ultra 9 285K',
        cpu_category_id,
        intel_brand_id,
        599.00,
        4.7,
        178,
        true,
        '{"series": "Intel Core Ultra 9", "generation": "Intel Arrow Lake", "cores": 24, "threads": 24, "base_clock": 3.7, "boost_clock": 5.7, "cache": 36, "tdp": 125, "socket": "LGA1851", "architecture": "Arrow Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- Core Ultra 7 265K
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core Ultra 7 265K',
        'Core Ultra 7 265K',
        cpu_category_id,
        intel_brand_id,
        399.00,
        4.6,
        234,
        true,
        '{"series": "Intel Core Ultra 7", "generation": "Intel Arrow Lake", "cores": 20, "threads": 20, "base_clock": 3.9, "boost_clock": 5.5, "cache": 30, "tdp": 125, "socket": "LGA1851", "architecture": "Arrow Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core Ultra 7 265
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core Ultra 7 265',
        'Core Ultra 7 265',
        cpu_category_id,
        intel_brand_id,
        349.00,
        4.5,
        168,
        true,
        '{"series": "Intel Core Ultra 7", "generation": "Intel Arrow Lake", "cores": 20, "threads": 20, "base_clock": 2.4, "boost_clock": 5.3, "cache": 30, "tdp": 65, "socket": "LGA1851", "architecture": "Arrow Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;
    
    -- Core Ultra 5 245K
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core Ultra 5 245K',
        'Core Ultra 5 245K',
        cpu_category_id,
        intel_brand_id,
        309.00,
        4.5,
        312,
        true,
        '{"series": "Intel Core Ultra 5", "generation": "Intel Arrow Lake", "cores": 14, "threads": 14, "base_clock": 4.2, "boost_clock": 5.2, "cache": 24, "tdp": 125, "socket": "LGA1851", "architecture": "Arrow Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core Ultra 5 245
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core Ultra 5 245',
        'Core Ultra 5 245',
        cpu_category_id,
        intel_brand_id,
        269.00,
        4.4,
        141,
        true,
        '{"series": "Intel Core Ultra 5", "generation": "Intel Arrow Lake", "cores": 14, "threads": 14, "base_clock": 3.5, "boost_clock": 5.1, "cache": 24, "tdp": 65, "socket": "LGA1851", "architecture": "Arrow Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core Ultra 5 225
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core Ultra 5 225',
        'Core Ultra 5 225',
        cpu_category_id,
        intel_brand_id,
        229.00,
        4.3,
        96,
        true,
        '{"series": "Intel Core Ultra 5", "generation": "Intel Arrow Lake", "cores": 10, "threads": 10, "base_clock": 3.3, "boost_clock": 4.9, "cache": 20, "tdp": 65, "socket": "LGA1851", "architecture": "Arrow Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- Intel Core 14th Gen CPUs (LGA1700)
    -- ==========================================

    -- Core i9-14900K
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i9-14900K',
        'Core i9-14900K',
        cpu_category_id,
        intel_brand_id,
        549.00,
        4.8,
        526,
        true,
        '{"series": "Intel Core i9", "generation": "Intel 14th Gen", "cores": 24, "threads": 32, "base_clock": 3.2, "boost_clock": 6.0, "cache": 36, "tdp": 125, "socket": "LGA1700", "architecture": "Raptor Lake Refresh"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core i7-14700K
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i7-14700K',
        'Core i7-14700K',
        cpu_category_id,
        intel_brand_id,
        389.00,
        4.8,
        641,
        true,
        '{"series": "Intel Core i7", "generation": "Intel 14th Gen", "cores": 20, "threads": 28, "base_clock": 3.4, "boost_clock": 5.6, "cache": 33, "tdp": 125, "socket": "LGA1700", "architecture": "Raptor Lake Refresh"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core i5-14600K
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i5-14600K',
        'Core i5-14600K',
        cpu_category_id,
        intel_brand_id,
        299.00,
        4.7,
        712,
        true,
        '{"series": "Intel Core i5", "generation": "Intel 14th Gen", "cores": 14, "threads": 20, "base_clock": 3.5, "boost_clock": 5.3, "cache": 24, "tdp": 125, "socket": "LGA1700", "architecture": "Raptor Lake Refresh"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core i5-14400F
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i5-14400F',
        'Core i5-14400F',
        cpu_category_id,
        intel_brand_id,
        189.00,
        4.5,
        438,
        true,
        '{"series": "Intel Core i5", "generation": "Intel 14th Gen", "cores": 10, "threads": 16, "base_clock": 2.5, "boost_clock": 4.7, "cache": 20, "tdp": 65, "socket": "LGA1700", "architecture": "Raptor Lake Refresh"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core i3-14100F
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i3-14100F',
        'Core i3-14100F',
        cpu_category_id,
        intel_brand_id,
        109.00,
        4.4,
        284,
        true,
        '{"series": "Intel Core i3", "generation": "Intel 14th Gen", "cores": 4, "threads": 8, "base_clock": 3.5, "boost_clock": 4.7, "cache": 12, "tdp": 58, "socket": "LGA1700", "architecture": "Raptor Lake Refresh"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- Intel Core 13th/12th Gen Value CPUs (LGA1700)
    -- ==========================================

    -- Core i7-13700K
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i7-13700K',
        'Core i7-13700K',
        cpu_category_id,
        intel_brand_id,
        349.00,
        4.7,
        825,
        true,
        '{"series": "Intel Core i7", "generation": "Intel 13th Gen", "cores": 16, "threads": 24, "base_clock": 3.4, "boost_clock": 5.4, "cache": 30, "tdp": 125, "socket": "LGA1700", "architecture": "Raptor Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core i5-13600K
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i5-13600K',
        'Core i5-13600K',
        cpu_category_id,
        intel_brand_id,
        269.00,
        4.7,
        934,
        true,
        '{"series": "Intel Core i5", "generation": "Intel 13th Gen", "cores": 14, "threads": 20, "base_clock": 3.5, "boost_clock": 5.1, "cache": 24, "tdp": 125, "socket": "LGA1700", "architecture": "Raptor Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core i5-13400F
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i5-13400F',
        'Core i5-13400F',
        cpu_category_id,
        intel_brand_id,
        169.00,
        4.6,
        786,
        true,
        '{"series": "Intel Core i5", "generation": "Intel 13th Gen", "cores": 10, "threads": 16, "base_clock": 2.5, "boost_clock": 4.6, "cache": 20, "tdp": 65, "socket": "LGA1700", "architecture": "Raptor Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- Core i5-12400F
    INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
    VALUES (
        'Intel Core i5-12400F',
        'Core i5-12400F',
        cpu_category_id,
        intel_brand_id,
        139.00,
        4.6,
        1021,
        true,
        '{"series": "Intel Core i5", "generation": "Intel 12th Gen", "cores": 6, "threads": 12, "base_clock": 2.5, "boost_clock": 4.4, "cache": 18, "tdp": 65, "socket": "LGA1700", "architecture": "Alder Lake"}'::jsonb,
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop'
    )
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- LGA1851 Motherboards for Arrow Lake
    -- ==========================================
    
    -- Get motherboard category
    DECLARE
        mb_category_id UUID;
        asus_brand_id UUID;
        msi_brand_id UUID;
        gigabyte_brand_id UUID;
    BEGIN
        SELECT id INTO mb_category_id FROM categories WHERE slug = 'motherboard';
        
        -- Get or create motherboard brands
        SELECT id INTO asus_brand_id FROM brands WHERE slug = 'asus';
        IF asus_brand_id IS NULL THEN
            INSERT INTO brands (name, slug) VALUES ('ASUS', 'asus')
            RETURNING id INTO asus_brand_id;
        END IF;
        
        SELECT id INTO msi_brand_id FROM brands WHERE slug = 'msi';
        IF msi_brand_id IS NULL THEN
            INSERT INTO brands (name, slug) VALUES ('MSI', 'msi')
            RETURNING id INTO msi_brand_id;
        END IF;
        
        SELECT id INTO gigabyte_brand_id FROM brands WHERE slug = 'gigabyte';
        IF gigabyte_brand_id IS NULL THEN
            INSERT INTO brands (name, slug) VALUES ('Gigabyte', 'gigabyte')
            RETURNING id INTO gigabyte_brand_id;
        END IF;

        -- ASUS ROG Maximus Z890 Hero
        INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
        VALUES (
            'ASUS ROG Maximus Z890 Hero',
            'Z890 Hero',
            mb_category_id,
            asus_brand_id,
            699.00,
            4.8,
            89,
            true,
            '{"socket": "LGA1851", "chipset": "Z890", "form_factor": "ATX", "memory_type": "DDR5", "memory_slots": 4, "max_memory": 256, "pcie_slots": 3, "m2_slots": 5, "wifi": true}'::jsonb,
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop'
        )
        ON CONFLICT DO NOTHING;
        
        -- MSI MEG Z890 ACE
        INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
        VALUES (
            'MSI MEG Z890 ACE',
            'Z890 ACE',
            mb_category_id,
            msi_brand_id,
            599.00,
            4.7,
            67,
            true,
            '{"socket": "LGA1851", "chipset": "Z890", "form_factor": "ATX", "memory_type": "DDR5", "memory_slots": 4, "max_memory": 256, "pcie_slots": 3, "m2_slots": 4, "wifi": true}'::jsonb,
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop'
        )
        ON CONFLICT DO NOTHING;
        
        -- Gigabyte Z890 AORUS Master
        INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
        VALUES (
            'Gigabyte Z890 AORUS Master',
            'Z890 AORUS Master',
            mb_category_id,
            gigabyte_brand_id,
            549.00,
            4.6,
            78,
            true,
            '{"socket": "LGA1851", "chipset": "Z890", "form_factor": "ATX", "memory_type": "DDR5", "memory_slots": 4, "max_memory": 256, "pcie_slots": 3, "m2_slots": 4, "wifi": true}'::jsonb,
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop'
        )
        ON CONFLICT DO NOTHING;
        
        -- Budget option: MSI PRO Z890-P
        INSERT INTO components (name, model, category_id, brand_id, price, rating, review_count, in_stock, specs, image_url)
        VALUES (
            'MSI PRO Z890-P WiFi',
            'PRO Z890-P',
            mb_category_id,
            msi_brand_id,
            249.00,
            4.4,
            145,
            true,
            '{"socket": "LGA1851", "chipset": "Z890", "form_factor": "ATX", "memory_type": "DDR5", "memory_slots": 4, "max_memory": 192, "pcie_slots": 2, "m2_slots": 3, "wifi": true}'::jsonb,
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop'
        )
        ON CONFLICT DO NOTHING;
    END;

END $$;
