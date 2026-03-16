import * as Common from './common.mjs';
import * as Charts from './charts.mjs';
import {getTheme} from './echarts-sauce-theme.mjs';

Common.enableSentry();
Common.RAFThrottlePatcher.singleton().setFPSLimit(12);

const doc = document.documentElement;

const allFields = ['power', 'hr', 'speed', 'cadence', 'draft', 'wbal'];

const settingsStore = new Common.SettingsStore('power-hr-graph-settings-v1');
const settings = settingsStore.get(null, {
    timeWindow: 600,
    xAxisMode: 'elapsed',
    powerEn: true,
    hrEn: true,
    speedEn: false,
    cadenceEn: false,
    draftEn: false,
    wbalEn: false,
    dataSmoothing: 0,
    solidBackground: false,
    backgroundColor: '#00ff00',
    transparency: 20,
});
Common.themeInit(settingsStore);
Common.localeInit(settingsStore);
doc.classList.remove('hidden-during-load');


function getEnabledFields() {
    return allFields.filter(x => settings[x + 'En']).map(x => Charts.streamFields[x]);
}


function formatElapsedAxis(ms, nowMs) {
    const secAgo = Math.round((nowMs - ms) / 1000);
    const sign = secAgo > 0 ? '-' : '';
    const abs = Math.abs(secAgo);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${sign}${m}:${String(s).padStart(2, '0')}`;
}


function formatTimeOfDayAxis(ms) {
    const d = new Date(ms);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}


export async function main() {
    Common.initInteractionListeners();
    Common.setBackground(settings);
    const content = document.querySelector('#content');
    const chartEl = content.querySelector('.chart');
    const legendEl = content.querySelector('.legend');
    const echarts = await import('../deps/src/echarts.mjs');
    echarts.registerTheme('sauce', getTheme('dynamic'));
    const chart = echarts.init(chartEl, 'sauce', {renderer: 'svg'});

    let fields = getEnabledFields();
    let sport = 'cycling';
    let streamsCache = null;
    let athleteId = null;
    let lastCreated = null;
    let loading = false;
    let powerZones = null;
    let athleteFTP = null;
    const clippyHackId = Charts.getMagicZonesClippyHackId();

    function initChart() {
        fields = getEnabledFields();
        Charts.setSport(sport);
        chart.setOption({
            animation: false,
            color: fields.map(f => f.color),
            visualMap: Charts.getStreamFieldVisualMaps(fields),
            legend: {show: false},
            tooltip: {
                className: 'ec-tooltip',
                trigger: 'axis',
                axisPointer: {label: {formatter: () => ''}},
            },
            xAxis: [{
                type: 'time',
                splitNumber: 5,
                axisLabel: {
                    formatter: settings.xAxisMode === 'elapsed'
                        ? '{mm}:{ss}'
                        : '{HH}:{mm}:{ss}',
                },
                splitLine: {show: false},
            }],
            yAxis: fields.map(f => ({
                show: false,
                id: f.id,
                min: x => Math.min(f.domain[0], x.min),
                max: x => Math.max(f.domain[1], x.max),
            })),
            series: fields.map((f, i) => ({
                type: 'line',
                animation: false,
                showSymbol: false,
                emphasis: {disabled: true},
                areaStyle: {},
                id: f.id,
                name: typeof f.name === 'function' ? f.name() : f.name,
                z: fields.length - i + 1,
                yAxisIndex: i,
                tooltip: {valueFormatter: f.fmt},
                lineStyle: {color: f.color},
                data: [],
            })),
        }, true);

        if (chart._sauceLegend) {
            chart._sauceLegend.render();
        } else {
            chart._sauceLegend = new Charts.SauceLegend({
                el: legendEl,
                chart,
                hiddenStorageKey: 'power-hr-graph-hidden-legend',
            });
        }
    }

    function renderStreams() {
        if (!streamsCache || !streamsCache.time.length) {
            return;
        }
        const timeWindow = settings.timeWindow * 1000;
        const maxCacheMs = timeWindow * 2;
        const lastTime = streamsCache.time[streamsCache.time.length - 1];

        // Trim old data beyond 2x window
        if (streamsCache.time.length > 100) {
            const cutoff = lastTime - maxCacheMs;
            let trimIdx = 0;
            while (trimIdx < streamsCache.time.length && streamsCache.time[trimIdx] < cutoff) {
                trimIdx++;
            }
            if (trimIdx > 0) {
                streamsCache.time.splice(0, trimIdx);
                for (const f of allFields) {
                    if (streamsCache[f]) {
                        streamsCache[f].splice(0, trimIdx);
                    }
                }
            }
        }

        const windowStart = lastTime - timeWindow;
        let startIdx = 0;
        while (startIdx < streamsCache.time.length && streamsCache.time[startIdx] < windowStart) {
            startIdx++;
        }
        if (startIdx > 0) {
            startIdx--; // Include one point before window for line continuity
        }

        const hasPowerZones = powerZones && athleteFTP && fields.find(x => x.id === 'power') &&
            !chart._sauceLegend.hidden.has('power');

        const xAxisOpt = {
            min: windowStart,
            max: lastTime,
        };
        if (settings.xAxisMode === 'elapsed') {
            xAxisOpt.axisLabel = {
                formatter: v => formatElapsedAxis(v, lastTime),
            };
        } else {
            xAxisOpt.axisLabel = {
                formatter: v => formatTimeOfDayAxis(v),
            };
        }

        chart.setOption({
            xAxis: [xAxisOpt],
            series: fields.map(field => {
                const times = streamsCache.time;
                const values = streamsCache[field.id];
                if (!values) {
                    return {data: []};
                }
                const data = [];
                for (let i = startIdx; i < times.length; i++) {
                    data.push([times[i], values[i]]);
                }
                return {
                    data,
                    name: typeof field.name === 'function' ? field.name() : field.name,
                    areaStyle: field.id === 'power' && hasPowerZones ? {color: 'magic-zones'} : {},
                };
            }),
        });
    }

    chart.on('rendered', () => Charts.magicZonesAfterRender({
        chart,
        hackId: clippyHackId,
        seriesId: 'power',
        zones: powerZones,
        ftp: athleteFTP,
        zLevel: 5,
    }));

    const em = () => Number(getComputedStyle(chartEl).fontSize.slice(0, -2));

    function onResize() {
        chart.resize();
        const e = em();
        chart.setOption({
            grid: {
                top: 0.5 * e,
                left: 0.5 * e,
                right: 0.5 * e,
                bottom: 2 * e,
            },
        });
        renderStreams();
    }

    addEventListener('resize', onResize);
    onResize();

    Common.subscribe('athlete/watching', async data => {
        sport = data.state.sport || 'cycling';
        Charts.setSport(sport);
        athleteFTP = data.athlete?.ftp;
        if (data.athleteId !== athleteId || data.created !== lastCreated) {
            athleteId = data.athleteId;
            lastCreated = data.created;
            if (loading) {
                return;
            }
            loading = true;
            powerZones = null;
            try {
                const [streams, zones] = await Promise.all([
                    Common.rpc.getAthleteStreams(athleteId),
                    Common.rpc.getPowerZones(1),
                ]);
                powerZones = zones;
                streamsCache = {time: []};
                for (const f of allFields) {
                    streamsCache[f] = [];
                }
                if (streams && streams.time) {
                    streamsCache.time = streams.time;
                    for (const f of allFields) {
                        streamsCache[f] = streams[f] || [];
                    }
                }
            } finally {
                loading = false;
            }
            renderStreams();
        }
    });

    Common.subscribe('streams/watching', streams => {
        if (!streamsCache || loading) {
            return;
        }
        if (streams.time) {
            streamsCache.time.push(...streams.time);
        }
        for (const f of allFields) {
            if (streams[f]) {
                streamsCache[f].push(...streams[f]);
            }
        }
        if (Common.isVisible()) {
            renderStreams();
        }
    });

    settingsStore.addEventListener('changed', ev => {
        const changed = ev.data.changed;
        if (changed.has('solidBackground') || changed.has('backgroundColor')) {
            Common.setBackground(settings);
        }
        const fieldChanged = allFields.some(x => changed.has(x + 'En'));
        const axisChanged = changed.has('xAxisMode') || changed.has('timeWindow');
        if (fieldChanged) {
            initChart();
        }
        if (fieldChanged || axisChanged) {
            renderStreams();
        }
    });

    initChart();
}


export async function settingsMain() {
    Common.initInteractionListeners();
    await Common.initSettingsForm('form', {store: settingsStore})();
}
