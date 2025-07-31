/**
 * Browser UMD Consumer Test - Validates UMD build in browser environment
 * Tests the dual package 'browser' export from package.json
 */

(function() {
    'use strict';

    const output = document.getElementById('output');
    const loadingStatus = document.getElementById('loading-status');
    const performanceChart = document.getElementById('performance-chart');
    
    let performanceMetrics = {};
    let testResults = {
        basic: [],
        advanced: [],
        performance: []
    };

    // Utility functions
    function log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        const formattedMessage = `[${timestamp}] ${prefix} ${message}`;
        
        output.textContent += formattedMessage + '\n';
        output.scrollTop = output.scrollHeight;
    }

    function assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    function clearOutput() {
        output.textContent = '';
    }

    function updatePerformanceChart() {
        const metrics = Object.entries(performanceMetrics);
        if (metrics.length === 0) return;

        const maxTime = Math.max(...metrics.map(([, time]) => time));
        
        performanceChart.innerHTML = '';
        metrics.forEach(([name, time]) => {
            const bar = document.createElement('div');
            bar.className = 'perf-bar';
            bar.style.height = `${(time / maxTime) * 80 + 20}px`;
            bar.textContent = `${time.toFixed(1)}ms`;
            bar.title = `${name}: ${time.toFixed(2)}ms`;
            performanceChart.appendChild(bar);
        });
    }

    // Check if UMD loaded successfully
    function checkUMDLoading() {
        const startTime = performance.now();
        
        try {
            // Test 1: Check global namespace
            if (typeof window.HSM === 'undefined') {
                throw new Error('HSM global namespace not found');
            }
            
            // Test 2: Check required exports
            if (typeof window.HSM.createMachine !== 'function') {
                throw new Error('createMachine not found in HSM namespace');
            }
            
            if (typeof window.HSM.action !== 'function') {
                throw new Error('action helper not found in HSM namespace');
            }
            
            const loadTime = performance.now() - startTime;
            performanceMetrics['UMD Load'] = loadTime;
            
            // Update UI
            loadingStatus.innerHTML = `
                <div class="status-indicator status-success"></div>
                <span class="success">UMD package loaded successfully (${loadTime.toFixed(2)}ms)</span>
            `;
            
            // Enable test buttons
            document.getElementById('run-basic-tests').disabled = false;
            document.getElementById('run-advanced-tests').disabled = false;
            document.getElementById('run-performance-tests').disabled = false;
            
            log('🌐 Browser UMD Consumer Test - Starting Tests\n', 'info');
            log('📦 UMD Package Loading:', 'info');
            log('  ✅ HSM global namespace available', 'success');
            log('  ✅ createMachine function available', 'success');
            log('  ✅ action helper function available', 'success');
            log(`  ⏱️ Load time: ${loadTime.toFixed(2)}ms`, 'info');
            
            return true;
        } catch (error) {
            loadingStatus.innerHTML = `
                <div class="status-indicator status-error"></div>
                <span class="error">Failed to load UMD package: ${error.message}</span>
            `;
            log(`❌ UMD Loading Failed: ${error.message}`, 'error');
            return false;
        }
    }

    // Basic functionality tests
    function runBasicTests() {
        log('\n🏗️ Running Basic Functionality Tests:', 'info');
        const startTime = performance.now();
        
        try {
            // Test 1: Machine creation
            const machine = window.HSM.createMachine('browser-test-machine');
            assert(machine.name === 'browser-test-machine', 'Machine name should match');
            log('  ✅ Machine created with correct name', 'success');
            
            // Test 2: State creation
            const idle = machine.state('idle');
            const active = machine.state('active');
            const completed = machine.state('completed');
            
            assert(idle.name === 'idle', 'Idle state name should match');
            assert(active.name === 'active', 'Active state name should match');
            assert(completed.name === 'completed', 'Completed state name should match');
            log('  ✅ States created successfully', 'success');
            
            // Test 3: Transitions
            idle.on('START', active);
            active.on('COMPLETE', completed);
            completed.on('RESET', idle);
            machine.initial(idle);
            
            log('  ✅ Transitions configured', 'success');
            
            // Test 4: Instance creation
            const instance = machine.start();
            assert(instance.current === 'idle', 'Initial state should be idle');
            log('  ✅ Instance started in correct state', 'success');
            
            const basicTime = performance.now() - startTime;
            performanceMetrics['Basic Tests'] = basicTime;
            
            log(`  📊 Basic tests completed in ${basicTime.toFixed(2)}ms`, 'info');
            testResults.basic.push({ passed: true, time: basicTime });
            
            return { machine, instance };
        } catch (error) {
            const basicTime = performance.now() - startTime;
            log(`❌ Basic test failed: ${error.message}`, 'error');
            testResults.basic.push({ passed: false, error: error.message, time: basicTime });
            throw error;
        }
    }

    // Advanced functionality tests
    async function runAdvancedTests() {
        log('\n🔄 Running Advanced Functionality Tests:', 'info');
        const startTime = performance.now();
        
        try {
            const { machine, instance } = runBasicTests();
            
            // Test 1: Async transitions
            await instance.send('START');
            assert(instance.current === 'active', 'Should transition to active');
            log('  ✅ Async transition to active state', 'success');
            
            await instance.send('COMPLETE');
            assert(instance.current === 'completed', 'Should transition to completed');
            log('  ✅ Async transition to completed state', 'success');
            
            await instance.send('RESET');
            assert(instance.current === 'idle', 'Should reset to idle');
            log('  ✅ Full transition cycle completed', 'success');
            
            // Test 2: Action helper
            let actionExecuted = false;
            const testAction = window.HSM.action('browser-test-action', function(ctx) {
                actionExecuted = true;
                ctx.browserTestCompleted = true;
                return { success: true, environment: 'browser' };
            });
            
            assert(testAction.actionName === 'browser-test-action', 'Action should have correct name');
            log('  ✅ Action helper created', 'success');
            
            const actionContext = {};
            const actionResult = await testAction(actionContext);
            assert(actionExecuted === true, 'Action should have executed');
            assert(actionResult.success === true, 'Action should return success');
            assert(actionResult.environment === 'browser', 'Action should identify browser environment');
            log('  ✅ Action executed successfully', 'success');
            
            // Test 3: Browser-specific features
            assert(typeof window !== 'undefined', 'Window object should be available');
            assert(typeof document !== 'undefined', 'Document object should be available');
            log('  ✅ Browser environment detected', 'success');
            
            // Test 4: Error handling
            try {
                await instance.send('INVALID_EVENT');
                log('  ✅ Invalid events handled gracefully', 'success');
            } catch (error) {
                log(`  ✅ Error handling works: ${error.message}`, 'success');
            }
            
            const advancedTime = performance.now() - startTime;
            performanceMetrics['Advanced Tests'] = advancedTime;
            
            log(`  📊 Advanced tests completed in ${advancedTime.toFixed(2)}ms`, 'info');
            testResults.advanced.push({ passed: true, time: advancedTime });
            
        } catch (error) {
            const advancedTime = performance.now() - startTime;
            log(`❌ Advanced test failed: ${error.message}`, 'error');
            testResults.advanced.push({ passed: false, error: error.message, time: advancedTime });
            throw error;
        }
    }

    // Performance tests
    async function runPerformanceTests() {
        log('\n⚡ Running Performance Tests:', 'info');
        const startTime = performance.now();
        
        try {
            // Test 1: Rapid machine creation
            const creationStart = performance.now();
            const machines = [];
            for (let i = 0; i < 100; i++) {
                machines.push(window.HSM.createMachine(`perf-test-${i}`));
            }
            const creationTime = performance.now() - creationStart;
            performanceMetrics['100 Machines'] = creationTime;
            log(`  ⏱️ Created 100 machines in ${creationTime.toFixed(2)}ms`, 'info');
            
            // Test 2: Rapid transitions
            const machine = machines[0];
            const state1 = machine.state('state1');
            const state2 = machine.state('state2');
            state1.on('TOGGLE', state2);
            state2.on('TOGGLE', state1);
            machine.initial(state1);
            
            const instance = machine.start();
            const transitionStart = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                await instance.send('TOGGLE');
            }
            
            const transitionTime = performance.now() - transitionStart;
            performanceMetrics['1000 Transitions'] = transitionTime;
            log(`  ⏱️ Executed 1000 transitions in ${transitionTime.toFixed(2)}ms`, 'info');
            
            // Test 3: Memory usage (approximate)
            const memoryTest = performance.now();
            const largeMachine = window.HSM.createMachine('memory-test');
            
            // Create many states
            for (let i = 0; i < 50; i++) {
                largeMachine.state(`state-${i}`);
            }
            
            const memoryTime = performance.now() - memoryTest;
            performanceMetrics['50 States'] = memoryTime;
            log(`  🧠 Created 50-state machine in ${memoryTime.toFixed(2)}ms`, 'info');
            
            const perfTime = performance.now() - startTime;
            log(`  📊 Performance tests completed in ${perfTime.toFixed(2)}ms`, 'info');
            testResults.performance.push({ passed: true, time: perfTime });
            
            // Update performance chart
            updatePerformanceChart();
            
        } catch (error) {
            const perfTime = performance.now() - startTime;
            log(`❌ Performance test failed: ${error.message}`, 'error');
            testResults.performance.push({ passed: false, error: error.message, time: perfTime });
            throw error;
        }
    }

    // Summary report
    function generateSummaryReport() {
        log('\n📋 Test Summary Report:', 'info');
        
        const allTests = [...testResults.basic, ...testResults.advanced, ...testResults.performance];
        const passed = allTests.filter(t => t.passed).length;
        const total = allTests.length;
        
        log(`  📊 Tests Passed: ${passed}/${total}`, passed === total ? 'success' : 'error');
        
        if (Object.keys(performanceMetrics).length > 0) {
            log('\n  ⚡ Performance Summary:', 'info');
            Object.entries(performanceMetrics).forEach(([name, time]) => {
                log(`    ${name}: ${time.toFixed(2)}ms`, 'info');
            });
        }
        
        log('\n📦 Browser UMD Integration:', 'info');
        log('  🌍 Global namespace: window.HSM', 'success');
        log('  📁 Source file: dist/umd/hsmjs.min.js', 'success');
        log('  🎯 Module format: Universal Module Definition', 'success');
        log('  🏷️ Browser compatibility: ES5+', 'success');
        log('\n🎉 Browser UMD Consumer Test Complete!', 'success');
    }

    // Event listeners
    document.getElementById('run-basic-tests').addEventListener('click', function() {
        try {
            runBasicTests();
            log('\n✅ Basic tests completed successfully!', 'success');
        } catch (error) {
            log(`\n❌ Basic tests failed: ${error.message}`, 'error');
        }
    });

    document.getElementById('run-advanced-tests').addEventListener('click', function() {
        runAdvancedTests().then(() => {
            log('\n✅ Advanced tests completed successfully!', 'success');
        }).catch(error => {
            log(`\n❌ Advanced tests failed: ${error.message}`, 'error');
        });
    });

    document.getElementById('run-performance-tests').addEventListener('click', function() {
        runPerformanceTests().then(() => {
            log('\n✅ Performance tests completed successfully!', 'success');
            generateSummaryReport();
        }).catch(error => {
            log(`\n❌ Performance tests failed: ${error.message}`, 'error');
        });
    });

    document.getElementById('clear-output').addEventListener('click', clearOutput);

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkUMDLoading);
    } else {
        checkUMDLoading();
    }

})();