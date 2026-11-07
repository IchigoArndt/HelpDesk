const config = {
  port: Number(process.env.PORT) || 3000,
  // Membros gerados pela massa de volume (seed) usam este domínio e não entram
  // na listagem/ranking de membros, para não encobrir pessoas reais.
  fillerEmailDomain: "massa.circuito.example",
  // Origens do front (ex.: https://circuito.vercel.app). Use * só em demo.
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
};

module.exports = config;
