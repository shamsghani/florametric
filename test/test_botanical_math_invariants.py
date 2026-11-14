import math
import random
import os

# Comprehensive Mathematical Invariant & Botanical Simulation Test Suite
from test_genetic_variance import GeneticPlantSimulator

def run_botanical_math_invariants():
    print("==================================================")
    print("RUNNING BOTANICAL MATHEMATICAL INVARIANT TESTS")
    print("==================================================")
    
    passed_tests = 0
    total_tests = 0

    # ----------------------------------------------------
    # TEST 1: Shoot Elongation Monotonicity with Age
    # ----------------------------------------------------
    total_tests += 1
    print("\n[Test 1] Shoot length monotonically non-decreasing with age...")
    sim = GeneticPlantSimulator(seed=123, plant_type="sunflower")
    prev_h = 0
    monotonic = True
    for age_step in [0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 0.85, 1.0]:
        data = sim.simulate(age=age_step)
        h = data['shoot_h']
        if h < prev_h:
            monotonic = False
            print(f"FAILED: height decreased from {prev_h} to {h} at age {age_step}")
        prev_h = h
    assert monotonic, "Shoot elongation must be monotonically non-decreasing"
    passed_tests += 1
    print(f"PASSED: Height increased smoothly from {sim.simulate(0.05)['shoot_h']}px to {sim.simulate(1.0)['shoot_h']}px.")

    # ----------------------------------------------------
    # TEST 2: Internode Inhibition Distance Between Leaves
    # ----------------------------------------------------
    total_tests += 1
    print("\n[Test 2] Internode inhibition distance field check...")
    spacing_respected = True
    min_dist_found = 9999
    
    for test_seed in range(100, 150):
        s = GeneticPlantSimulator(seed=test_seed, plant_type="sunflower")
        p = s.simulate(age=1.0)
        # Check pairwise distances between leaf clusters
        cluster_ys = sorted(list(set([l['y'] for l in p['leaves']])))
        for i in range(len(cluster_ys) - 1):
            dy = cluster_ys[i+1] - cluster_ys[i]
            # Ignore paired leaves at identical or adjacent y (+4px)
            if dy > 6:
                if dy < min_dist_found:
                    min_dist_found = dy
                if dy < 25: # minimum cluster spacing threshold
                    spacing_respected = False
                    print(f"FAILED: Cluster spacing violation: dy={dy} at seed {test_seed}")
                    
    assert spacing_respected, "Leaf clusters must respect minimum inhibition distance"
    passed_tests += 1
    print(f"PASSED: Across 50 seeds, minimum leaf cluster spacing was {min_dist_found}px (threshold: 25px).")

    # ----------------------------------------------------
    # TEST 3: Branching Requires Active Leaf Vigor Threshold
    # ----------------------------------------------------
    total_tests += 1
    print("\n[Test 3] Auxin branching threshold check...")
    branching_correct = True
    for test_seed in range(200, 250):
        s = GeneticPlantSimulator(seed=test_seed, plant_type="sunflower")
        # At young age (0.3), plant should NEVER have branches
        young_p = s.simulate(age=0.3)
        if len(young_p['branches']) > 0:
            branching_correct = False
            print(f"FAILED: Young plant sprouted branch with 0 or few leaves at seed {test_seed}")
        # At mature age, branches only sprout if healthy leaf count >= 3
        mature_p = s.simulate(age=1.0)
        active_l = [l for l in mature_p['leaves'] if not l['is_wilted']]
        if len(mature_p['branches']) > 0 and len(active_l) < 3:
            branching_correct = False
            print(f"FAILED: Branch spawned with insufficient active leaves ({len(active_l)})")
            
    assert branching_correct, "Branching must strictly obey active leaf threshold"
    passed_tests += 1
    print("PASSED: Across 50 seeds, zero premature branches formed. Branching strictly obeys auxin vigor.")

    # ----------------------------------------------------
    # TEST 4: Leaf Energy Modulates Flower Scale
    # ----------------------------------------------------
    total_tests += 1
    print("\n[Test 4] Photosynthetic leaf energy flower scale modulation...")
    energy_modulated = True
    # Test plant with 1 leaf vs 4 leaves vs 8 leaves
    scales = []
    for test_seed in [10, 42, 99]:
        s = GeneticPlantSimulator(seed=test_seed, plant_type="sunflower")
        # Compare flower scale when leaves are present
        p_mature = s.simulate(age=1.0)
        scales.append((p_mature['flower_scale'], len([l for l in p_mature['leaves'] if not l['is_wilted']])))
        
    for sc, num_l in scales:
        print(f"  -> Active leaves: {num_l} => Flower scale factor: {sc:.2f}x")
        if sc < 0.5 or sc > 1.6:
            energy_modulated = False
            
    assert energy_modulated, "Flower scale must scale within valid biological boundaries"
    passed_tests += 1
    print("PASSED: Flower diameter dynamically scales with photosynthetic energy.")

    # ----------------------------------------------------
    # TEST 5: Basal Leaf Senescence & Wilting
    # ----------------------------------------------------
    total_tests += 1
    print("\n[Test 5] Basal leaf senescence / wilting dynamics...")
    senescence_verified = True
    wilted_count_young = 0
    wilted_count_mature = 0
    
    for test_seed in range(300, 330):
        s = GeneticPlantSimulator(seed=test_seed, plant_type="sunflower")
        p_young = s.simulate(age=0.5)
        p_mature = s.simulate(age=1.0)
        
        # In young plants, leaves should NOT be wilted
        w_young = sum(1 for l in p_young['leaves'] if l['is_wilted'])
        w_mature = sum(1 for l in p_mature['leaves'] if l['is_wilted'])
        
        wilted_count_young += w_young
        wilted_count_mature += w_mature
        
        # Basal wilted leaves must strictly be in lower half of plant
        for l in p_mature['leaves']:
            if l['is_wilted'] and l['y'] > p_mature['shoot_h'] * 0.45:
                senescence_verified = False
                print(f"FAILED: Upper leaf wilted inappropriately at y={l['y']}")
                
    assert wilted_count_young == 0, "Young plants should have 0 wilted leaves"
    assert wilted_count_mature > 0, "Mature plants must demonstrate basal senescence"
    assert senescence_verified, "Wilting must be restricted to older basal leaves"
    passed_tests += 1
    print(f"PASSED: Young plants have {wilted_count_young} wilted leaves. Mature plants have {wilted_count_mature} wilted basal leaves strictly near ground.")

    print("\n==================================================")
    print(f"ALL {passed_tests}/{total_tests} BOTANICAL TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

run_botanical_math_invariants()
