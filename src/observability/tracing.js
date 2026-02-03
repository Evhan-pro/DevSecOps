/**
 * OpenTelemetry Tracing
 *
 * Bonus "traces" demandé :
 * - Auto-instrumentation HTTP/Express
 * - Spans custom pour actions critiques (login/register/download)
 *
 * Par défaut : exporter console (aucune infra requise)
 * Option : exporter OTLP HTTP vers Jaeger (docker-compose-otel.yml)
 */

const { diag, DiagConsoleLogger, DiagLogLevel, trace } = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');


const { resourceFromAttributes } = require('@opentelemetry/resources');

const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const enabled = String(process.env.OTEL_ENABLED || '1') === '1';

// Ne pas polluer les tests unitaires (et éviter les timeouts)
const isTest = process.env.NODE_ENV === 'test';

let sdk;

function initTracing() {
  if (!enabled || isTest) return;

  // Logs OTEL uniquement si tu en as besoin
  if (String(process.env.OTEL_DIAG || '0') === '1') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || 'demo-devsecops-api-j1';
  const exporterMode = (process.env.OTEL_EXPORTER || 'console').toLowerCase();

  // Exporter : console (par défaut) ou OTLP HTTP
  const traceExporter =
    exporterMode === 'otlp'
      ? new OTLPTraceExporter({
          // Jaeger all-in-one peut exposer OTLP HTTP sur 4318
          url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        })
      : new ConsoleSpanExporter();

  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  sdk = new NodeSDK({
    resource,
    spanProcessor: new SimpleSpanProcessor(traceExporter),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    const maybePromise = sdk.start();
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.catch((err) => console.error('OTEL start error', err));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('OTEL start error', err);
  }


  // Arrêt propre
  process.on('SIGTERM', shutdownTracing);
  process.on('SIGINT', shutdownTracing);
}

async function shutdownTracing() {
  if (!sdk) return;
  try {
    await sdk.shutdown();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('OTEL shutdown error', err);
  }
}

function getTracer() {
  return trace.getTracer(process.env.OTEL_SERVICE_NAME || 'demo-devsecops-api-j1');
}

module.exports = {
  initTracing,
  shutdownTracing,
  getTracer,
};
