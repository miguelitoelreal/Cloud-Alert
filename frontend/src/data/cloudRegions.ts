// Approximate lat/lon for major cloud provider regions
export interface CloudRegionLocation {
  name: string;
  lat: number;
  lon: number;
  providers: string[];
}

export const cloudRegionLocations: Record<string, CloudRegionLocation> = {
  // AWS
  "us-east-1": { name: "US East (N. Virginia)", lat: 39.0, lon: -77.0, providers: ["AWS"] },
  "us-east-2": { name: "US East (Ohio)", lat: 40.0, lon: -82.0, providers: ["AWS"] },
  "us-west-1": { name: "US West (N. California)", lat: 37.0, lon: -122.0, providers: ["AWS"] },
  "us-west-2": { name: "US West (Oregon)", lat: 45.5, lon: -122.0, providers: ["AWS"] },
  "us-gov-east-1": { name: "AWS GovCloud (US-East)", lat: 39.0, lon: -77.0, providers: ["AWS"] },
  "us-gov-west-1": { name: "AWS GovCloud (US-West)", lat: 37.0, lon: -122.0, providers: ["AWS"] },
  "ca-central-1": { name: "Canada (Central)", lat: 45.5, lon: -73.5, providers: ["AWS"] },
  "sa-east-1": { name: "South America (São Paulo)", lat: -23.5, lon: -46.5, providers: ["AWS"] },
  "eu-west-1": { name: "Europe (Ireland)", lat: 53.3, lon: -6.2, providers: ["AWS"] },
  "eu-west-2": { name: "Europe (London)", lat: 51.5, lon: -0.1, providers: ["AWS"] },
  "eu-west-3": { name: "Europe (Paris)", lat: 48.8, lon: 2.3, providers: ["AWS"] },
  "eu-central-1": { name: "Europe (Frankfurt)", lat: 50.1, lon: 8.7, providers: ["AWS"] },
  "eu-north-1": { name: "Europe (Stockholm)", lat: 59.3, lon: 18.0, providers: ["AWS"] },
  "eu-south-1": { name: "Europe (Milan)", lat: 45.4, lon: 9.2, providers: ["AWS"] },
  "me-south-1": { name: "Middle East (Bahrain)", lat: 26.0, lon: 50.5, providers: ["AWS"] },
  "af-south-1": { name: "Africa (Cape Town)", lat: -33.9, lon: 18.4, providers: ["AWS"] },
  "ap-south-1": { name: "Asia Pacific (Mumbai)", lat: 19.0, lon: 72.8, providers: ["AWS"] },
  "ap-south-2": { name: "Asia Pacific (Hyderabad)", lat: 17.4, lon: 78.4, providers: ["AWS"] },
  "ap-southeast-1": { name: "Asia Pacific (Singapore)", lat: 1.3, lon: 103.8, providers: ["AWS"] },
  "ap-southeast-2": { name: "Asia Pacific (Sydney)", lat: -33.8, lon: 151.2, providers: ["AWS"] },
  "ap-southeast-3": { name: "Asia Pacific (Jakarta)", lat: -6.2, lon: 106.8, providers: ["AWS"] },
  "ap-southeast-4": { name: "Asia Pacific (Melbourne)", lat: -37.8, lon: 144.9, providers: ["AWS"] },
  "ap-northeast-1": { name: "Asia Pacific (Tokyo)", lat: 35.6, lon: 139.6, providers: ["AWS"] },
  "ap-northeast-2": { name: "Asia Pacific (Seoul)", lat: 37.5, lon: 127.0, providers: ["AWS"] },
  "ap-northeast-3": { name: "Asia Pacific (Osaka)", lat: 34.6, lon: 135.5, providers: ["AWS"] },

  // Azure
  "East US": { name: "East US", lat: 37.0, lon: -79.0, providers: ["Azure"] },
  "East US 2": { name: "East US 2", lat: 36.8, lon: -78.0, providers: ["Azure"] },
  "Central US": { name: "Central US", lat: 41.0, lon: -93.0, providers: ["Azure"] },
  "North Central US": { name: "North Central US", lat: 41.8, lon: -87.6, providers: ["Azure"] },
  "South Central US": { name: "South Central US", lat: 29.4, lon: -98.5, providers: ["Azure"] },
  "West US": { name: "West US", lat: 37.0, lon: -122.0, providers: ["Azure"] },
  "West US 2": { name: "West US 2", lat: 47.0, lon: -122.0, providers: ["Azure"] },
  "West US 3": { name: "West US 3", lat: 33.4, lon: -112.0, providers: ["Azure"] },
  "West Central US": { name: "West Central US", lat: 41.2, lon: -104.8, providers: ["Azure"] },
  "Canada Central": { name: "Canada Central", lat: 45.5, lon: -73.5, providers: ["Azure"] },
  "Canada East": { name: "Canada East", lat: 46.8, lon: -71.2, providers: ["Azure"] },
  "Brazil South": { name: "Brazil South", lat: -23.5, lon: -46.5, providers: ["Azure"] },
  "Brazil Southeast": { name: "Brazil Southeast", lat: -22.9, lon: -43.2, providers: ["Azure"] },
  "North Europe": { name: "North Europe", lat: 53.3, lon: -6.2, providers: ["Azure"] },
  "West Europe": { name: "West Europe", lat: 52.3, lon: 4.9, providers: ["Azure"] },
  "UK South": { name: "UK South", lat: 51.5, lon: -0.1, providers: ["Azure"] },
  "UK West": { name: "UK West", lat: 53.0, lon: -3.0, providers: ["Azure"] },
  "France Central": { name: "France Central", lat: 48.8, lon: 2.3, providers: ["Azure"] },
  "Germany West Central": { name: "Germany West Central", lat: 50.1, lon: 8.7, providers: ["Azure"] },
  "Norway East": { name: "Norway East", lat: 59.9, lon: 10.7, providers: ["Azure"] },
  "Switzerland North": { name: "Switzerland North", lat: 47.3, lon: 8.5, providers: ["Azure"] },
  "Sweden Central": { name: "Sweden Central", lat: 59.3, lon: 18.0, providers: ["Azure"] },
  "Poland Central": { name: "Poland Central", lat: 52.2, lon: 21.0, providers: ["Azure"] },
  "UAE North": { name: "UAE North", lat: 25.2, lon: 55.3, providers: ["Azure"] },
  "South Africa North": { name: "South Africa North", lat: -25.7, lon: 28.2, providers: ["Azure"] },
  "Central India": { name: "Central India", lat: 18.5, lon: 73.8, providers: ["Azure"] },
  "South India": { name: "South India", lat: 13.0, lon: 80.2, providers: ["Azure"] },
  "Southeast Asia": { name: "Southeast Asia", lat: 1.3, lon: 103.8, providers: ["Azure"] },
  "East Asia": { name: "East Asia", lat: 22.3, lon: 114.1, providers: ["Azure"] },
  "Japan East": { name: "Japan East", lat: 35.6, lon: 139.6, providers: ["Azure"] },
  "Japan West": { name: "Japan West", lat: 34.6, lon: 135.5, providers: ["Azure"] },
  "Korea Central": { name: "Korea Central", lat: 37.5, lon: 127.0, providers: ["Azure"] },
  "Korea South": { name: "Korea South", lat: 35.1, lon: 129.0, providers: ["Azure"] },
  "Australia East": { name: "Australia East", lat: -33.8, lon: 151.2, providers: ["Azure"] },
  "Australia Southeast": { name: "Australia Southeast", lat: -37.8, lon: 144.9, providers: ["Azure"] },

  // GCP
  "us-central1": { name: "Iowa", lat: 41.2, lon: -93.0, providers: ["GCP"] },
  "us-east1": { name: "South Carolina", lat: 33.8, lon: -80.0, providers: ["GCP"] },
  "us-east4": { name: "Northern Virginia", lat: 39.0, lon: -77.0, providers: ["GCP"] },
  "us-east5": { name: "Columbus", lat: 39.9, lon: -82.0, providers: ["GCP"] },
  "us-south1": { name: "Dallas", lat: 32.7, lon: -96.7, providers: ["GCP"] },
  "us-west1": { name: "Oregon", lat: 45.5, lon: -122.0, providers: ["GCP"] },
  "us-west2": { name: "Los Angeles", lat: 34.0, lon: -118.0, providers: ["GCP"] },
  "us-west3": { name: "Salt Lake City", lat: 40.7, lon: -111.8, providers: ["GCP"] },
  "us-west4": { name: "Las Vegas", lat: 36.1, lon: -115.1, providers: ["GCP"] },
  "northamerica-northeast1": { name: "Montréal", lat: 45.5, lon: -73.5, providers: ["GCP"] },
  "northamerica-northeast2": { name: "Toronto", lat: 43.6, lon: -79.3, providers: ["GCP"] },
  "southamerica-east1": { name: "São Paulo", lat: -23.5, lon: -46.5, providers: ["GCP"] },
  "southamerica-west1": { name: "Santiago", lat: -33.4, lon: -70.6, providers: ["GCP"] },
  "europe-west1": { name: "Belgium", lat: 50.8, lon: 4.3, providers: ["GCP"] },
  "europe-west2": { name: "London", lat: 51.5, lon: -0.1, providers: ["GCP"] },
  "europe-west3": { name: "Frankfurt", lat: 50.1, lon: 8.7, providers: ["GCP"] },
  "europe-west4": { name: "Netherlands", lat: 53.4, lon: 6.2, providers: ["GCP"] },
  "europe-west6": { name: "Zurich", lat: 47.3, lon: 8.5, providers: ["GCP"] },
  "europe-west8": { name: "Milan", lat: 45.4, lon: 9.2, providers: ["GCP"] },
  "europe-west9": { name: "Paris", lat: 48.8, lon: 2.3, providers: ["GCP"] },
  "europe-north1": { name: "Finland", lat: 60.1, lon: 24.9, providers: ["GCP"] },
  "europe-central2": { name: "Warsaw", lat: 52.2, lon: 21.0, providers: ["GCP"] },
  "europe-southwest1": { name: "Madrid", lat: 40.4, lon: -3.7, providers: ["GCP"] },
  "me-west1": { name: "Tel Aviv", lat: 32.0, lon: 34.7, providers: ["GCP"] },
  "me-central1": { name: "Doha", lat: 25.2, lon: 51.4, providers: ["GCP"] },
  "africa-south1": { name: "Johannesburg", lat: -26.2, lon: 28.0, providers: ["GCP"] },
  "asia-east1": { name: "Taiwan", lat: 23.5, lon: 121.0, providers: ["GCP"] },
  "asia-east2": { name: "Hong Kong", lat: 22.3, lon: 114.1, providers: ["GCP"] },
  "asia-northeast1": { name: "Tokyo", lat: 35.6, lon: 139.6, providers: ["GCP"] },
  "asia-northeast2": { name: "Osaka", lat: 34.6, lon: 135.5, providers: ["GCP"] },
  "asia-northeast3": { name: "Seoul", lat: 37.5, lon: 127.0, providers: ["GCP"] },
  "asia-southeast1": { name: "Singapore", lat: 1.3, lon: 103.8, providers: ["GCP"] },
  "asia-southeast2": { name: "Jakarta", lat: -6.2, lon: 106.8, providers: ["GCP"] },
  "asia-south1": { name: "Mumbai", lat: 19.0, lon: 72.8, providers: ["GCP"] },
  "asia-south2": { name: "Delhi", lat: 28.6, lon: 77.2, providers: ["GCP"] },
  "australia-southeast1": { name: "Sydney", lat: -33.8, lon: 151.2, providers: ["GCP"] },
  "australia-southeast2": { name: "Melbourne", lat: -37.8, lon: 144.9, providers: ["GCP"] },
};

export function getRegionCoords(region: string | null | undefined): { lat: number; lon: number } | null {
  if (!region) return null;

  // Direct match
  const direct = cloudRegionLocations[region];
  if (direct) return { lat: direct.lat, lon: direct.lon };

  // Try partial match (e.g. "US East (N. Virginia)" might contain "us-east-1")
  for (const [key, loc] of Object.entries(cloudRegionLocations)) {
    if (region.toLowerCase().includes(key.toLowerCase())) {
      return { lat: loc.lat, lon: loc.lon };
    }
  }

  // Try matching by common abbreviations
  const normal = region.toLowerCase().replace(/\s/g, "-");
  for (const [key, loc] of Object.entries(cloudRegionLocations)) {
    if (normal.includes(key.toLowerCase()) || key.toLowerCase().includes(normal)) {
      return { lat: loc.lat, lon: loc.lon };
    }
  }

  return null;
}
