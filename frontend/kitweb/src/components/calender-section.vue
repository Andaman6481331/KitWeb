<template>
    <!-- Calender Section: Open days -->
    <section class="calender-section">
        <div class="section-header">
            <h2 class="section-title">Open Days</h2>
            <p class="section-subtitle">Check our opening days</p>
        </div>
        <div class="calender">
            <div class="calender-header">
                <h3 class="calender-title">January 2026</h3>
            </div>
            <div class="calender-body">
                <div class="calender-grid">
                    <div class="calender-day">Sun</div>
                    <div class="calender-day">Mon</div>
                    <div class="calender-day">Tue</div>
                    <div class="calender-day">Wed</div>
                    <div class="calender-day">Thu</div>
                    <div class="calender-day">Fri</div>
                    <div class="calender-day">Sat</div>
                    <div class="calender-day">1</div>
                    <div class="calender-day">2</div>
                    <div class="calender-day">3</div>
                    <div class="calender-day">4</div>
                    <div class="calender-day">5</div>
                    <div class="calender-day">6</div>
                    <div class="calender-day">7</div>
                    <div class="calender-day">8</div>
                    <div class="calender-day">9</div>
                    <div class="calender-day">10</div>
                    <div class="calender-day">11</div>
                    <div class="calender-day">12</div>
                    <div class="calender-day">13</div>
                    <div class="calender-day">14</div>
                    <div class="calender-day">15</div>
                    <div class="calender-day">16</div>
                    <div class="calender-day">17</div>
                    <div class="calender-day">18</div>
                    <div class="calender-day">19</div>
                    <div class="calender-day">20</div>
                    <div class="calender-day">21</div>
                    <div class="calender-day">22</div>
                    <div class="calender-day">23</div>
                    <div class="calender-day">24</div>
                    <div class="calender-day">25</div>
                    <div class="calender-day">26</div>
                    <div class="calender-day">27</div>
                    <div class="calender-day">28</div>
                    <div class="calender-day">29</div>
                    <div class="calender-day">30</div>
                    <div class="calender-day">31</div>
                </div>
            </div>
        </div>
    </section>
</template>
<style>
/* ===== CALENDER SECTION ===== */
.calender-section {
    padding: 60px 0;
    background: white;
}

.section-header {
    text-align: center;
    margin-bottom: 40px;
}

.section-title {
    font-size: 32px;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 10px 0;
}

.section-subtitle {
    font-size: 16px;
    color: #666;
    margin: 0;
}

.calender {
    max-width: 1000px;
    margin: 0 auto;
    background: white;
    border-radius: 20px;
    box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

.calender-header {
    background: linear-gradient(135deg, #8b6f47, #b89968);
    padding: 24px;
    text-align: center;
}

.calender-title {
    font-size: 24px;
    font-weight: 700;
    color: white;
    margin: 0;
}

.calender-body {
    padding: 24px;
}

.calender-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 12px;
}

.calender-day {
    text-align: center;
    padding: 16px 8px;
    font-size: 16px;
    font-weight: 600;
    color: #2d2d2d;
}

.calender-day:first-child,
.calender-day:nth-child(8),
.calender-day:nth-child(15),
.calender-day:nth-child(22),
.calender-day:nth-child(29) {
    color: #b89968;
}

.calender-day:nth-child(n+8) {
    background: #f9f9f9;
    border-radius: 8px;
    transition: all 0.3s ease;
}

.calender-day:nth-child(n+8):hover {
    background: #e8e8e8;
    transform: translateY(-2px);
}
</style>