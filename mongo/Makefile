objects=zips counties places states
tiger_url=https://www2.census.gov/geo/tiger/TIGER2016/
db_name=geo

zips: tl_2016_us_zcta510.geo.json
	$(call importAndIndex,postalcodes,GEOID10)

counties: tl_2016_us_county.geo.json
	$(call importAndIndex,counties,NAME)

places: place.geo.json
	$(call importAndIndex,places,NAME)

states: tl_2016_us_state.geo.json
	$(call importAndIndex,states,NAME)

%.geo.json: %.zip
	ogr2ogr -t_srs crs:84 -f "GeoJSON" /vsistdout/ /vsizip/$< \
		| ./pluck.js \
		> $@.tmp
	mv $@.tmp $@

tl_2016_us_zcta510.zip:
	curl -LSsO $$tiger_url/ZCTA5/$@

tl_2016_us_county.zip:
	curl -LSsO $$tiger_url/COUNTY/$@

tl_2016_us_state.zip:
	curl -LSsO $$tiger_url/PLACE/$@

# use wget -r?
tl_2016_us_place.zip:
	curl -LSsO $$tiger_url/PLACE/$@

image:
	docker build -t gcr.io/boundariesio/api:$$(git rev-parse --short HEAD) .

push: image
	gcloud docker push gcr.io/boundariesio/api:$$(git rev-parse --short HEAD)


clean:
	# pass

define importAndIndex
	mongo localhost/$(db_name) --eval "JSON.stringify(db.$1.ensureIndex({geometry: '2dsphere'}))"
	mongo localhost/$(db_name) --eval "JSON.stringify(db.$1.ensureIndex({'properties.$2': 'text'}))"
	mongoimport \
		--upsert \
		--upsertFields $2 \
		--collection $1 \
		--db $(db_name) \
		< ./$<
endef

# .PRECIOUS: %.zip %.geo.json
.INTERMEDIATE: %.tmp

.PHONY: clean image