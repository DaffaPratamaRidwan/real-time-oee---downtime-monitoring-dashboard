import postgres from 'postgres'
import * as dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/oee_factory_db'

async function seed() {
  console.log(`[DB Seeder] Connecting to ${databaseUrl}...`)
  const sql = postgres(databaseUrl, { max: 1 })

  try {
    console.log('[DB Seeder] Cleaning existing records...')
    await sql`TRUNCATE machine_telemetry, downtime_events, oee_hourly_records, production_logs, downtime_reasons, downtime_categories, production_lines, products, operators, shifts, departments RESTART IDENTITY CASCADE;`

    // 1. Departments
    console.log('[DB Seeder] Inserting departments...')
    const departments = await sql`
      INSERT INTO departments (code, name, description) VALUES
      ('SMT', 'Surface Mount Technology', 'High-speed automated PCB pick-and-place & reflow soldering'),
      ('WND', 'Magnetics & Transformer Winding', 'Precision toroidal & bobbin coil winding and varnishing'),
      ('HAR', 'Wire Harness & Cabling', 'Automated wire cut, strip, crimp, and multi-pin connector harness assembly'),
      ('ASM', 'Power Electronics Final Assembly', 'Inverter, power supply, and relay module sub-assembly & enclosure boxing'),
      ('TST', 'High Voltage & Quality Testing', 'Automated Optical Inspection (AOI), Hi-Pot dielectric, and burn-in testing')
      RETURNING id, code, name;
    `
    const deptMap = Object.fromEntries(departments.map(d => [d.code, d.id]))

    // 2. Shifts
    console.log('[DB Seeder] Inserting shifts...')
    const shifts = await sql`
      INSERT INTO shifts (code, name, start_time, end_time, planned_duration_mins, break_duration_mins) VALUES
      ('SHIFT_1', 'Morning Shift', '06:00:00', '14:00:00', 480, 60),
      ('SHIFT_2', 'Afternoon Shift', '14:00:00', '22:00:00', 480, 60),
      ('SHIFT_3', 'Night Shift', '22:00:00', '06:00:00', 480, 60)
      RETURNING id, code, name;
    `
    const shiftMap = Object.fromEntries(shifts.map(s => [s.code, s.id]))

    // 3. Operators
    console.log('[DB Seeder] Inserting operators...')
    const operators = await sql`
      INSERT INTO operators (code, name, shift_id, department_id, role) VALUES
      ('OP-101', 'Elena Rostova', ${shiftMap['SHIFT_1']}, ${deptMap['SMT']}, 'Supervisor'),
      ('OP-102', 'Marcus Vance', ${shiftMap['SHIFT_1']}, ${deptMap['SMT']}, 'Technician'),
      ('OP-103', 'Li Wei', ${shiftMap['SHIFT_1']}, ${deptMap['WND']}, 'Operator'),
      ('OP-104', 'Sarah Jenkins', ${shiftMap['SHIFT_1']}, ${deptMap['HAR']}, 'Technician'),
      ('OP-105', 'David Okafor', ${shiftMap['SHIFT_1']}, ${deptMap['ASM']}, 'Operator'),
      ('OP-106', 'Tariq Al-Mansoor', ${shiftMap['SHIFT_1']}, ${deptMap['TST']}, 'Quality Engineer'),
      ('OP-201', 'Ananya Sharma', ${shiftMap['SHIFT_2']}, ${deptMap['SMT']}, 'Supervisor'),
      ('OP-202', 'Carlos Mendez', ${shiftMap['SHIFT_2']}, ${deptMap['HAR']}, 'Operator'),
      ('OP-301', 'Kenji Sato', ${shiftMap['SHIFT_3']}, ${deptMap['SMT']}, 'Technician')
      RETURNING id, code, name;
    `
    const opMap = Object.fromEntries(operators.map(o => [o.code, o.id]))

    // 4. Products
    console.log('[DB Seeder] Inserting products...')
    const products = await sql`
      INSERT INTO products (code, name, category, standard_cycle_time_sec, ideal_units_per_hour, unit_cost) VALUES
      ('PCB-INV-500', 'Industrial 5kW Inverter PCB Rev 4.2', 'SMT Board', 15.00, 240, 185.00),
      ('PCB-CTRL-32', '32-Bit Microcontroller Gate Driver Board', 'SMT Board', 12.00, 300, 92.50),
      ('TFR-TOR-24V', 'High-Isolation Toroidal Transformer 24V/10A', 'Transformer', 45.00, 80, 42.00),
      ('HAR-EV-800', 'High-Voltage EV Fast-Charger Harness', 'Wire Harness', 30.00, 120, 68.00),
      ('PWR-SUP-DIN', '24V 480W DIN-Rail Power Supply Unit', 'Power Supply', 20.00, 180, 95.00),
      ('REL-SSD-40A', 'Heavy Duty Solid-State Relay 40A', 'Relay', 10.00, 360, 28.00),
      ('MTR-SMART-3P', '3-Phase Smart Industrial Power Meter', 'Smart Meter', 25.00, 144, 140.00)
      RETURNING id, code, name;
    `
    const prodMap = Object.fromEntries(products.map(p => [p.code, p.id]))

    // 5. Production Lines
    console.log('[DB Seeder] Inserting production lines...')
    const lines = await sql`
      INSERT INTO production_lines (code, name, department_id, target_oee, ideal_units_per_hour, current_status, current_product_id, current_operator_id, description) VALUES
      ('SMT-01', 'SMT High-Speed Line 1 (Chip Shooter)', ${deptMap['SMT']}, 88.00, 240, 'RUNNING', ${prodMap['PCB-INV-500']}, ${opMap['OP-101']}, 'Dual-gantry modular mounter with 10-zone nitrogen reflow oven'),
      ('SMT-02', 'SMT High-Density Line 2 (Fine Pitch)', ${deptMap['SMT']}, 85.00, 300, 'DOWNTIME', ${prodMap['PCB-CTRL-32']}, ${opMap['OP-102']}, 'High-precision BGA/QFN placement line with 3D solder paste inspection'),
      ('WND-01', 'Auto Toroidal Transformer Winder Line', ${deptMap['WND']}, 82.00, 80, 'RUNNING', ${prodMap['TFR-TOR-24V']}, ${opMap['OP-103']}, 'CNC 4-axis toroidal core coiler with automatic copper insulation stripping'),
      ('HAR-01', 'Automotive Wire Harness Assembly Line', ${deptMap['HAR']}, 80.00, 120, 'RUNNING', ${prodMap['HAR-EV-800']}, ${opMap['OP-104']}, 'Automated crimping center with integrated crimp force monitoring (CFM)'),
      ('ASM-01', 'DIN-Rail Power Supply Final Assembly', ${deptMap['ASM']}, 85.00, 180, 'IDLE', ${prodMap['PWR-SUP-DIN']}, ${opMap['OP-105']}, 'Pneumatic screw driving, potted case sealing, and laser serialization'),
      ('TST-01', 'High-Voltage Hi-Pot & Burn-In Test Station', ${deptMap['TST']}, 90.00, 144, 'RUNNING', ${prodMap['MTR-SMART-3P']}, ${opMap['OP-106']}, 'Multi-channel dielectric breakdown, insulation resistance, and 45°C burn-in chamber')
      RETURNING id, code, name;
    `
    const lineMap = Object.fromEntries(lines.map(l => [l.code, l.id]))

    // 6. Downtime Categories
    console.log('[DB Seeder] Inserting downtime categories...')
    const categories = await sql`
      INSERT INTO downtime_categories (code, name, is_planned, color, description) VALUES
      ('BREAKDOWN', 'Equipment Breakdown', FALSE, '#ef4444', 'Unscheduled mechanical, electrical, or robotic hardware failures'),
      ('PROCESS_LOSS', 'Process & Alignment Loss', FALSE, '#f97316', 'Feeder tape jams, nozzle vacuum loss, solder paste clogging'),
      ('MATERIAL_WAIT', 'Material Shortage / Starvation', FALSE, '#eab308', 'Waiting for SMD component reels, wire spools, or sub-assembly buffer'),
      ('SETUP_CHANGEOVER', 'Setup & Product Changeover', TRUE, '#8b5cf6', 'Feeder cart swap, reflow recipe thermal profiling, harness jig change'),
      ('PLANNED_MAINT', 'Preventive Maintenance', TRUE, '#3b82f6', 'Scheduled cleaning, optical camera calibration, conveyor lubrication'),
      ('QUALITY_HOLD', 'Quality Inspection Hold', FALSE, '#ec4899', 'AOI false call investigation, dielectric hi-pot re-calibration, scrap investigation')
      RETURNING id, code, name;
    `
    const catMap = Object.fromEntries(categories.map(c => [c.code, c.id]))

    // 7. Downtime Reasons (Pareto failure causes)
    console.log('[DB Seeder] Inserting downtime reasons...')
    const reasons = await sql`
      INSERT INTO downtime_reasons (category_id, code, name, description) VALUES
      -- Process Loss (High frequency in electrical factories)
      (${catMap['PROCESS_LOSS']}, 'SMT_FEEDER_JAM', 'Pick & Place Feeder Tape Jam', 'Component tape splice snagged or plastic embossed tape peeled incorrectly'),
      (${catMap['PROCESS_LOSS']}, 'SMT_NOZZLE_CLOG', 'SMT Vacuum Nozzle Clogged / Pickup Error', 'Flux residue or dust blocking suction cup tip causing component drop'),
      (${catMap['PROCESS_LOSS']}, 'PASTE_STENCIL_CLOG', 'Solder Paste Stencil Aperture Clog', 'Solder paste dried in 0.4mm pitch apertures requiring automated solvent wipe'),
      (${catMap['PROCESS_LOSS']}, 'CRIMP_FORCE_DEFECT', 'Crimp Force Monitoring (CFM) Alarm', 'Wire gauge tolerance deviation causing insufficient contact crimp height'),
      
      -- Equipment Breakdown
      (${catMap['BREAKDOWN']}, 'REFLOW_TEMP_DRIFT', 'Reflow Oven Zone 4 Temperature Drift', 'Thermocouple heater bank tripped thermal upper limit interlock'),
      (${catMap['BREAKDOWN']}, 'WIRE_STRIPPER_JAM', 'Rotary Wire Stripper Blade Jam', 'Copper strand buildup behind blade housing stalling stepper motor'),
      (${catMap['BREAKDOWN']}, 'HIPOT_TESTER_FAULT', 'Dielectric Tester Interlock Fault', 'Safety light curtain tripped or high-voltage discharge relay failure'),
      (${catMap['BREAKDOWN']}, 'CONVEYOR_BELT_FAULT', 'SMT Board Conveyor Jam / Sensor Error', 'Optical sensor reflector dirty causing PCB edge collision stop'),

      -- Material Shortage
      (${catMap['MATERIAL_WAIT']}, 'SMD_REEL_DEPLETED', 'SMD Capacitor/Resistor Reel Exhausted', 'Line stopped waiting for AGV/warehouse replenishment of 0402 parts'),
      (${catMap['MATERIAL_WAIT']}, 'COPPER_WIRE_DEPLETED', 'Magnet Wire Spool Depleted', 'Heavy copper wire drum ran out on transformer winding head'),
      (${catMap['MATERIAL_WAIT']}, 'ENCLOSURE_BUFFER_EMPTY', 'Chassis Enclosure Buffer Starved', 'Upstream stamping delayed delivery of aluminium DIN enclosures'),

      -- Setup & Changeover
      (${catMap['SETUP_CHANGEOVER']}, 'SMT_CART_CHANGEOVER', 'SMT Feeder Trolley Changeover', 'Swapping 80-lane feeder trolley for next scheduled PCB production order'),
      (${catMap['SETUP_CHANGEOVER']}, 'HARNESS_JIG_SETUP', 'Harness Routing Jig Configuration', 'Replacing magnetic harness layout board and pin guide blocks'),
      
      -- Planned Maintenance
      (${catMap['PLANNED_MAINT']}, 'DAILY_OPTICAL_CLEAN', 'Daily Optical Inspection Camera Clean', 'Clean optical lens, mirrors, and recalibrate fiducial recognition lasers'),
      (${catMap['PLANNED_MAINT']}, 'PNEUMATIC_FILTER_PM', 'Pneumatic System Water Purge & PM', 'Draining air filter condensates and checking main regulator pressure'),

      -- Quality Hold
      (${catMap['QUALITY_HOLD']}, 'AOI_SPIKE_HOLD', 'AOI Solder Bridging Spike Hold', 'Quality supervisor investigating consecutive solder bridging on QFP-64 ICs')
      RETURNING id, code, name;
    `
    const reasonMap = Object.fromEntries(reasons.map(r => [r.code, r.id]))

    // 8. Downtime Events (Historical 7 days + Active events)
    console.log('[DB Seeder] Generating downtime events (historical + active)...')
    const now = new Date()
    
    // We create realistic Pareto distribution: Feeder jams, nozzle clogs, stencil wipes, reel depleted are top 80%
    const historicalDowntimes = [
      // Day -6 to Day -1 events
      { line: 'SMT-01', reason: 'SMT_FEEDER_JAM', minsAgo: 7200, duration: 18, notes: 'Feeder #34 jammed on 100nF capacitor reel', res: 'Cleared tape guide and re-indexed sprocket' },
      { line: 'SMT-02', reason: 'SMT_NOZZLE_CLOG', minsAgo: 6800, duration: 25, notes: 'Nozzle #3 pickup error rate > 5%', res: 'Ultrasonic cleaned nozzle tip and tested vacuum' },
      { line: 'HAR-01', reason: 'CRIMP_FORCE_DEFECT', minsAgo: 5900, duration: 15, notes: 'CFM warning on terminal 14AWG', res: 'Adjusted micro-adjuster height by +0.03mm' },
      { line: 'SMT-01', reason: 'SMD_REEL_DEPLETED', minsAgo: 5200, duration: 32, notes: 'Waited for warehouse stock of STM32 MCU reels', res: 'Delivered by warehouse and barcode verified' },
      { line: 'WND-01', reason: 'COPPER_WIRE_DEPLETED', minsAgo: 4500, duration: 22, notes: 'Wire drum 0.8mm depleted', res: 'Spool replaced and tension tested' },
      { line: 'SMT-02', reason: 'PASTE_STENCIL_CLOG', minsAgo: 3900, duration: 14, notes: '0.4mm pitch solder bridging on prototype batch', res: 'Automated alcohol wet wipe performed' },
      { line: 'TST-01', reason: 'HIPOT_TESTER_FAULT', minsAgo: 3200, duration: 40, notes: 'Relay safety lock tripped during 2500V test', res: 'Reset safety interlock and recalibrated probe resistance' },
      { line: 'ASM-01', reason: 'ENCLOSURE_BUFFER_EMPTY', minsAgo: 2800, duration: 35, notes: 'Waiting for powder-coated chassis delivery', res: 'Buffer refilled from stamping shop' },
      { line: 'SMT-01', reason: 'SMT_FEEDER_JAM', minsAgo: 2100, duration: 12, notes: 'Splice tape stuck at feeder entrance', res: 'Respliced carrier tape' },
      { line: 'SMT-02', reason: 'REFLOW_TEMP_DRIFT', minsAgo: 1600, duration: 45, notes: 'Zone 4 heated to 248°C instead of 240°C', res: 'Replaced SSR relay module for heating element #4' },
      { line: 'HAR-01', reason: 'WIRE_STRIPPER_JAM', minsAgo: 1200, duration: 19, notes: 'Copper strands tangled in blade block', res: 'Disassembled blade guard and blown with dry compressed air' },
      { line: 'SMT-01', reason: 'SMT_CART_CHANGEOVER', minsAgo: 950, duration: 40, notes: 'Batch switch from Inverter board to Controller board', res: 'Completed feeder cart swap and barcode verification' },
      { line: 'SMT-02', reason: 'SMT_FEEDER_JAM', minsAgo: 700, duration: 16, notes: 'Feeder #12 cover tape loose', res: 'Tightened tension roller' },
      { line: 'SMT-01', reason: 'SMT_NOZZLE_CLOG', minsAgo: 500, duration: 11, notes: 'Nozzle purge cycle executed', res: 'Purged with vacuum solvent' },
      { line: 'TST-01', reason: 'AOI_SPIKE_HOLD', minsAgo: 320, duration: 28, notes: 'AOI flagged 6 consecutive solder bridges', res: 'Verified optical threshold was too aggressive, adjusted tolerance' },
      { line: 'WND-01', reason: 'DAILY_OPTICAL_CLEAN', minsAgo: 180, duration: 20, notes: 'Daily wire guide lubrication and camera wipe', res: 'Applied ISO-68 lubricant and wiped cameras' }
    ]

    for (const d of historicalDowntimes) {
      const startTime = new Date(now.getTime() - d.minsAgo * 60 * 1000)
      const endTime = new Date(startTime.getTime() + d.duration * 60 * 1000)
      const lineId = lineMap[d.line]
      const reasonId = reasonMap[d.reason]
      
      await sql`
        INSERT INTO downtime_events (
          line_id, reason_id, start_time, end_time, duration_seconds, 
          status, operator_notes, resolution_notes, reported_by, 
          acknowledged_at, resolved_at, created_at
        ) VALUES (
          ${lineId}, ${reasonId}, ${startTime}, ${endTime}, ${d.duration * 60},
          'RESOLVED', ${d.notes}, ${d.res}, ${opMap['OP-101']},
          ${new Date(startTime.getTime() + 2 * 60 * 1000)}, ${endTime}, ${startTime}
        );
      `
    }

    // Now insert ACTIVE / UNRESOLVED Downtime events happening right now!
    // SMT-02 is currently DOWN with Feeder Tape Jam (started 26 mins ago)
    const activeStart1 = new Date(now.getTime() - 26 * 60 * 1000)
    await sql`
      INSERT INTO downtime_events (
        line_id, reason_id, start_time, end_time, duration_seconds,
        status, operator_notes, reported_by, acknowledged_at, created_at
      ) VALUES (
        ${lineMap['SMT-02']}, ${reasonMap['SMT_FEEDER_JAM']}, ${activeStart1}, NULL, ${26 * 60},
        'ACTIVE', 'Feeder #42 (0402 10uF Capacitor) tape jammed. Micro-switch sensor tripped line emergency stop. Technician dispatched.',
        ${opMap['OP-102']}, ${new Date(activeStart1.getTime() + 3 * 60 * 1000)}, ${activeStart1}
      );
    `

    // ASM-01 is currently IDLE waiting for buffer (started 18 mins ago)
    const activeStart2 = new Date(now.getTime() - 18 * 60 * 1000)
    await sql`
      INSERT INTO downtime_events (
        line_id, reason_id, start_time, end_time, duration_seconds,
        status, operator_notes, reported_by, acknowledged_at, created_at
      ) VALUES (
        ${lineMap['ASM-01']}, ${reasonMap['ENCLOSURE_BUFFER_EMPTY']}, ${activeStart2}, NULL, ${18 * 60},
        'ACKNOWLEDGED', 'Inverter assembly conveyor starvation due to upstream SMT-02 feeder stop. Awaiting batch release.',
        ${opMap['OP-105']}, ${new Date(activeStart2.getTime() + 4 * 60 * 1000)}, ${activeStart2}
      );
    `

    // 9. Hourly OEE Records (Last 7 days, 24 hours per day)
    console.log('[DB Seeder] Generating 7 days of hourly OEE records for all 6 lines...')
    const hoursToGenerate = 7 * 24 // 168 hours
    
    // We'll insert in batches of 100 to avoid query size limits
    const oeeBatch = []
    const prodLogBatch = []

    for (let h = hoursToGenerate; h >= 0; h--) {
      const recordTime = new Date(now.getTime() - h * 3600 * 1000)
      const hourOfDay = recordTime.getHours()
      
      // Determine shift
      let shiftId = shiftMap['SHIFT_1']
      if (hourOfDay >= 14 && hourOfDay < 22) shiftId = shiftMap['SHIFT_2']
      else if (hourOfDay >= 22 || hourOfDay < 6) shiftId = shiftMap['SHIFT_3']

      for (const lineCode of ['SMT-01', 'SMT-02', 'WND-01', 'HAR-01', 'ASM-01', 'TST-01']) {
        const lineId = lineMap[lineCode]
        const plannedMins = 60.0
        
        // Base line characteristics
        let baseAvail = 0.92
        let basePerf = 0.94
        let baseQual = 0.985
        let targetPerHour = 240
        let idealCycle = 15.0
        let prodId = prodMap['PCB-INV-500']

        if (lineCode === 'SMT-02') {
          baseAvail = 0.84
          basePerf = 0.91
          baseQual = 0.978
          targetPerHour = 300
          idealCycle = 12.0
          prodId = prodMap['PCB-CTRL-32']
        } else if (lineCode === 'WND-01') {
          baseAvail = 0.88
          basePerf = 0.93
          baseQual = 0.991
          targetPerHour = 80
          idealCycle = 45.0
          prodId = prodMap['TFR-TOR-24V']
        } else if (lineCode === 'HAR-01') {
          baseAvail = 0.86
          basePerf = 0.92
          baseQual = 0.982
          targetPerHour = 120
          idealCycle = 30.0
          prodId = prodMap['HAR-EV-800']
        } else if (lineCode === 'ASM-01') {
          baseAvail = 0.89
          basePerf = 0.95
          baseQual = 0.992
          targetPerHour = 180
          idealCycle = 20.0
          prodId = prodMap['PWR-SUP-DIN']
        } else if (lineCode === 'TST-01') {
          baseAvail = 0.95
          basePerf = 0.96
          baseQual = 0.996
          targetPerHour = 144
          idealCycle = 25.0
          prodId = prodMap['MTR-SMART-3P']
        }

        // Add small pseudo-random variance based on hour
        const seedVal = Math.sin(h * 13 + lineId * 7) * 0.5 + 0.5
        const isCurrentHourDown = (h === 0 && (lineCode === 'SMT-02' || lineCode === 'ASM-01'))
        
        let downtimeMins = 0
        if (isCurrentHourDown) {
          downtimeMins = lineCode === 'SMT-02' ? 26 : 18
        } else {
          downtimeMins = Math.max(0, Math.round((1 - baseAvail) * 60 + (seedVal - 0.5) * 8))
        }

        const runMins = Math.max(0, plannedMins - downtimeMins)
        const availability = Number(((runMins / plannedMins) * 100).toFixed(2))

        const actualCapacityRatio = (runMins / plannedMins) * (basePerf + (seedVal - 0.5) * 0.05)
        const actualUnits = isCurrentHourDown 
          ? Math.round(targetPerHour * (runMins / 60))
          : Math.min(targetPerHour, Math.max(0, Math.round(targetPerHour * actualCapacityRatio)))
        
        const performance = runMins > 0 
          ? Math.min(100.0, Number((((actualUnits * idealCycle) / (runMins * 60)) * 100).toFixed(2)))
          : 0.0

        const scrapRate = (1 - baseQual) + (seedVal - 0.5) * 0.01
        const scrapUnits = Math.round(actualUnits * Math.max(0.002, scrapRate))
        const goodUnits = actualUnits - scrapUnits
        
        const quality = actualUnits > 0 
          ? Number(((goodUnits / actualUnits) * 100).toFixed(2))
          : 100.0

        const oee = Number(((availability * performance * quality) / 10000).toFixed(2))

        oeeBatch.push({
          line_id: lineId,
          shift_id: shiftId,
          record_timestamp: recordTime,
          planned_time_mins: plannedMins,
          run_time_mins: runMins,
          downtime_mins: downtimeMins,
          ideal_cycle_time_sec: idealCycle,
          target_units: targetPerHour,
          actual_units: actualUnits,
          good_units: goodUnits,
          scrap_units: scrapUnits,
          availability: availability,
          performance: performance,
          quality: quality,
          oee: oee
        })

        // Also add production log entry for scrap reason tracking
        if (scrapUnits > 0) {
          const scrapReasons = [
            'Solder Bridging (QFP/SOP)',
            'Component Tombstoning (0402)',
            'Cold Solder Joint',
            'Hi-Pot Flashover Failure',
            'Crimp Tensile Pull Failure',
            'Coil Insulation Scratch'
          ]
          const scrapReason = scrapReasons[Math.floor(seedVal * scrapReasons.length)]
          prodLogBatch.push({
            line_id: lineId,
            shift_id: shiftId,
            product_id: prodId,
            timestamp: recordTime,
            total_units: actualUnits,
            good_units: goodUnits,
            scrap_units: scrapUnits,
            scrap_reason: scrapReason
          })
        }
      }
    }

    // Insert batches
    console.log(`[DB Seeder] Inserting ${oeeBatch.length} hourly OEE records...`)
    for (let i = 0; i < oeeBatch.length; i += 200) {
      const slice = oeeBatch.slice(i, i + 200)
      await sql`
        INSERT INTO oee_hourly_records ${sql(slice, 
          'line_id', 'shift_id', 'record_timestamp', 'planned_time_mins', 
          'run_time_mins', 'downtime_mins', 'ideal_cycle_time_sec', 'target_units', 
          'actual_units', 'good_units', 'scrap_units', 'availability', 
          'performance', 'quality', 'oee'
        )}
      `
    }

    console.log(`[DB Seeder] Inserting ${prodLogBatch.length} production defect logs...`)
    for (let i = 0; i < prodLogBatch.length; i += 200) {
      const slice = prodLogBatch.slice(i, i + 200)
      await sql`
        INSERT INTO production_logs ${sql(slice,
          'line_id', 'shift_id', 'product_id', 'timestamp',
          'total_units', 'good_units', 'scrap_units', 'scrap_reason'
        )}
      `
    }

    // 10. Machine Telemetry (Current Live Sensor readings)
    console.log('[DB Seeder] Inserting live machine telemetry...')
    const telemetries = [
      {
        line_id: lineMap['SMT-01'],
        status: 'RUNNING',
        speed_units_per_hour: 236,
        temperature_c: 44.8,
        vibration_rms: 0.72,
        power_kw: 14.8,
        vacuum_pressure_kpa: -88.4,
        error_code: null,
        alert_level: 'NORMAL'
      },
      {
        line_id: lineMap['SMT-02'],
        status: 'DOWNTIME',
        speed_units_per_hour: 0,
        temperature_c: 58.2, // Overheating
        vibration_rms: 2.15, // High vibration
        power_kw: 3.2,
        vacuum_pressure_kpa: -32.1, // Vacuum lost!
        error_code: 'ERR_FEEDER_JAM_42',
        alert_level: 'CRITICAL'
      },
      {
        line_id: lineMap['WND-01'],
        status: 'RUNNING',
        speed_units_per_hour: 78,
        temperature_c: 38.4,
        vibration_rms: 1.10,
        power_kw: 8.4,
        vacuum_pressure_kpa: -75.0,
        error_code: null,
        alert_level: 'NORMAL'
      },
      {
        line_id: lineMap['HAR-01'],
        status: 'RUNNING',
        speed_units_per_hour: 118,
        temperature_c: 32.1,
        vibration_rms: 0.95,
        power_kw: 6.7,
        vacuum_pressure_kpa: -80.0,
        error_code: null,
        alert_level: 'NORMAL'
      },
      {
        line_id: lineMap['ASM-01'],
        status: 'IDLE',
        speed_units_per_hour: 0,
        temperature_c: 28.5,
        vibration_rms: 0.12,
        power_kw: 1.8,
        vacuum_pressure_kpa: -90.0,
        error_code: 'WARN_STARVATION_BUFFER',
        alert_level: 'WARNING'
      },
      {
        line_id: lineMap['TST-01'],
        status: 'RUNNING',
        speed_units_per_hour: 142,
        temperature_c: 42.0,
        vibration_rms: 0.45,
        power_kw: 18.2,
        vacuum_pressure_kpa: -85.0,
        error_code: null,
        alert_level: 'NORMAL'
      }
    ]

    await sql`
      INSERT INTO machine_telemetry ${sql(telemetries, 
        'line_id', 'status', 'speed_units_per_hour', 'temperature_c', 
        'vibration_rms', 'power_kw', 'vacuum_pressure_kpa', 'error_code', 'alert_level'
      )}
    `

    console.log('[DB Seeder] Database seeded successfully with realistic electrical factory OEE & downtime data!')
  } catch (err) {
    console.error('[DB Seeder] Error seeding database:', err)
    process.exit(1)
  } finally {
    await sql.end()
    console.log('[DB Seeder] Connection closed.')
  }
}

seed()
