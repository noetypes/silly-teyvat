#!/usr/bin/env python3
"""Look up public HoYoLAB Teyvat map markers in Silly Teyvat's native grid.

No account is required. Marker coordinates are copied directly, without a grid
conversion; the marker may be a viewpoint or an object near the destination.
"""
import argparse
import json
import math
import subprocess
import sys
import urllib.parse

BASE = 'https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v1/map/'
COMMON = {'map_id': 2, 'app_sn': 'ys_obc', 'lang': 'en-us'}


def fetch(endpoint, params):
    query = urllib.parse.urlencode({**COMMON, **params})
    result = subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                             '--max-time', '30', '--user-agent', 'SillyTeyvat-map-reference/1.0',
                             BASE + endpoint + '?' + query], check=True, capture_output=True)
    data = json.loads(result.stdout)
    if data.get('retcode') != 0:
        raise RuntimeError('HoYoLAB API error: ' + str(data.get('message')))
    return data['data']


def all_anchors(items):
    for item in items:
        yield item
        yield from all_anchors(item.get('children', []))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    query = parser.add_mutually_exclusive_group(required=True)
    query.add_argument('--point', type=int, help='Fetch exact marker coordinates and description')
    query.add_argument('--anchor', help='Find named map-label bounds (not a point coordinate)')
    query.add_argument('--near', type=float, nargs=2, metavar=('X', 'Y'), help='List markers near an existing native coordinate')
    parser.add_argument('--label', type=int, help='Only show this marker category with --near')
    parser.add_argument('--radius', type=float, default=150, help='Native-coordinate search radius (default 150)')
    parser.add_argument('--limit', type=int, default=25, help='Maximum nearby results (default 25)')
    args = parser.parse_args()
    if args.point is not None:
        point = fetch('point/info', {'point_id': args.point})['info']
        print(json.dumps({'pointId': point['id'], 'mapId': point['map_id'], 'labelId': point['label_id'],
                          'x': point['x_pos'], 'y': point['y_pos'], 'content': point.get('content'),
                          'image': point.get('img'), 'zLevel': point.get('z_level'),
                          'source': BASE + 'point/info?' + urllib.parse.urlencode({**COMMON, 'point_id': args.point})}, ensure_ascii=False, indent=2))
    elif args.anchor is not None:
        matches = [a for a in all_anchors(fetch('map_anchor/list', {})['list']) if args.anchor.casefold() in a['name'].casefold()]
        print(json.dumps([{'id': a['id'], 'name': a['name'], 'bounds': [a['l_x'], a['l_y'], a['r_x'], a['r_y']]} for a in matches], ensure_ascii=False, indent=2))
    else:
        if args.radius <= 0 or args.limit < 1:
            parser.error('--radius and --limit must be positive')
        x, y = args.near
        points = fetch('point/list', {})['point_list']
        matches = []
        for p in points:
            if args.label is not None and p['label_id'] != args.label:
                continue
            distance = math.hypot(p['x_pos'] - x, p['y_pos'] - y)
            if distance <= args.radius:
                matches.append({'id': p['id'], 'labelId': p['label_id'], 'x': p['x_pos'], 'y': p['y_pos'], 'distance': round(distance, 2), 'zLevel': p.get('z_level')})
        matches.sort(key=lambda row: (row['distance'], row['id']))
        print(json.dumps(matches[:args.limit], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (OSError, subprocess.CalledProcessError, ValueError, KeyError, RuntimeError) as error:
        print('Map lookup failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
