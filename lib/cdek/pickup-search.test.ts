import assert from "node:assert/strict";
import test from "node:test";
import { distanceKm, filterPickupOffices, pickupAddressesFromFeatures, pickupSearchBounds, rankPickupOffices } from "./pickup-search";
import type { CdekOffice } from "./types";

function office(code: string, address: string, latitude?: number, longitude?: number): CdekOffice {
  return { code, address, name: code, latitude, longitude, workTime: null, cityCode: 44 };
}

test("pickup search handles Cyrillic, ё, punctuation and house numbers", () => {
  const list = [office("A", "Москва, ул. Селезнёвская, 7"), office("B", "Москва, ул. Селезнёвская, 17")];
  assert.deepEqual(filterPickupOffices(list, "селезневская, д. 7").map(p => p.code), ["A"]);
  assert.equal(filterPickupOffices(list, "несуществующая").length, 0);
  assert.equal(filterPickupOffices(list, "").length, 2);
});

test("nearest PVZ can be on another street; missing coordinates never become zero", () => {
  const origin = { latitude: 55.75831, longitude: 37.61164 };
  const far = office("far", "Тверская, 100", 55.8, 37.65);
  const near = office("near", "Соседняя улица, 2", 55.7584, 37.6117);
  const missing = office("missing", "Тверская, 7");
  const ranked = rankPickupOffices([far, missing, near], origin);
  assert.deepEqual(ranked.map(p => p.code), ["near", "far"]);
  assert.ok(ranked[0].distanceKm < 0.02);
  assert.equal(distanceKm(origin, origin), 0);
  assert.ok(Math.abs(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111.195) < 0.01);
});

test("geocoding rejects city centres and results outside the selected city area", () => {
  const bounds = pickupSearchBounds([office("A", "Москва", 55.75, 37.6)]);
  assert.ok(bounds);
  const at = (longitude: number, latitude: number) => ({ coordinates: [longitude, latitude] });
  const addresses = pickupAddressesFromFeatures([
    { geometry: at(37.61, 55.76), properties: { countrycode: "RU", city: "Москва", street: "Тверская улица", housenumber: "7" } },
    { geometry: at(37.62, 55.76), properties: { countrycode: "RU", city: "Москва", name: "Тверская улица", type: "street" } },
    { geometry: at(37.6, 55.75), properties: { countrycode: "RU", name: "Москва", type: "city" } },
    { geometry: at(30.3, 59.9), properties: { countrycode: "RU", street: "Тверская", housenumber: "7" } },
    { geometry: at(37.61, 55.76), properties: { countrycode: "RU", city: "Москва", street: "Тверская улица", housenumber: "7" } },
  ], bounds);
  assert.equal(addresses.length, 2);
  assert.equal(addresses[0].precision, "house");
  assert.equal(addresses[1].precision, "street");
  assert.equal(pickupSearchBounds([office("no-coordinates", "Москва")]), null);
});
