if __name__ == "__main__":
    # Numbeo can run without the retired Global Property Guide dependencies below.
    from pathlib import Path
    from maps import build_maps
    from numbeo import collect, prepare_exports

    source = Path(__file__).parent / 'files' / 'numbeo.csv'
    checkpoint = source.with_name('numbeo.partial.csv')
    try:
        if checkpoint.exists() or not source.exists():
            collect(source)
        prepare_exports(source)
        build_maps()
    except (RuntimeError, ValueError) as exc:
        raise SystemExit(f'{exc}\nCompleted cities remain in the checkpoint.') from exc
    except KeyboardInterrupt:
        print('Stopped. Completed cities remain in the checkpoint.')
        raise SystemExit(130)
    raise SystemExit(0)

from bs4 import  BeautifulSoup
from tqdm import tqdm
from datetime import datetime
from pprint import pprint

import pickle
import yfinance as yf
import numpy as np
import requests
import pandas as pd

pd.options.display.max_rows = 500
pd.options.display.max_columns = 500
pd.options.display.width = 1800
pd.options.display.float_format = '{:.8f}'.format


# numbeo ---------------------------------------------------------------------------------------------------------------
def get_numbeo_data() -> None:
    from pathlib import Path
    from numbeo import collect

    collect(Path(__file__).parent / 'files' / 'numbeo.csv')

    return None


# globalpropertyguide --------------------------------------------------------------------------------------------------
def get_globalpropertyguide_unique_counties(agent: str) -> pd.DataFrame:
    """ На сайте кривые данные и нет единой страницы, которая бы реалистично показывала зону покрытия.
    Спарсим все города, для городов без ссылки, присвоим ссылку вручную.

    :return: Таблицу с названиями стран и ссылками на рентную доходность в их городах
    """

    req_urls = [
        'https://www.globalpropertyguide.com/rental-yields',
        'https://www.globalpropertyguide.com/Europe', 'https://www.globalpropertyguide.com/North-America',
        'https://www.globalpropertyguide.com/Asia', 'https://www.globalpropertyguide.com/Pacific',
        'https://www.globalpropertyguide.com/Middle-East', 'https://www.globalpropertyguide.com/Latin-America',
        'https://www.globalpropertyguide.com/most-expensive-cities',
        'https://www.globalpropertyguide.com/investment-rating'
    ]
    req = requests.Session()
    req.headers.update({'User-Agent': agent})

    # Table rental-yields
    links = []
    done_counties = []
    for url in tqdm(req_urls):
        page = req.get(url)
        soup = BeautifulSoup(page.content, 'html.parser')
        table = soup.find('table', {'id': 'simpletable'})
        for row in table.find_all('tr'):
            link = row.find('a')

            if link is not None:
                country = link.contents[0]
                if country not in done_counties:
                    cur_link = link['href']
                    if 'Rental-Yields' not in cur_link:
                        cur_link += '/Rental-Yields'
                    links.append([country, cur_link])
        done_counties = np.transpose(links)[0]

    ry_df = pd.DataFrame(links, columns=['Country', 'Link'])

    drop_countires = ['Australia, Sydney', 'Vietnam/HCMC', 'Slovakia']
    ry_df = ry_df[~ry_df['Country'].isin(drop_countires)].sort_values('Country').reset_index(drop=True)

    return ry_df


def month_corrector(update_str: str) -> datetime:
    update_str = update_str.replace('Last Updated: ', '')\
        .replace('Sept.', 'Sep.').replace('May ', 'May. ').replace('Oct ', 'Oct. ').replace('April ', 'Apr. ')

    return datetime.strptime(update_str, "%b. %d, %Y")


def get_exchange_ratio(df: pd.DataFrame, last_update: datetime, row: pd.Series) -> float:
    if df['PriceUSD'].str.contains('[€]', regex=True).any():
        exchange_rate = yf.download(
            tickers='EURUSD=X',
            start=last_update.strftime('%Y-%m-%d'),
            end=(last_update + pd.Timedelta(days=7)).strftime('%Y-%m-%d')
        )['Close'].iloc[0]
    elif df['PriceUSD'].str.contains('[£]', regex=True).any():
        exchange_rate = yf.download(
            tickers='GBPUSD=X',
            start=last_update.strftime('%Y-%m-%d'),
            end=(last_update + pd.Timedelta(days=7)).strftime('%Y-%m-%d')
        )['Close'].iloc[0]
    elif df['PriceUSD'].str.contains('[$]', regex=True).any():
        exchange_rate = 1
    else:
        raise Exception(f"Неизвестный тип валюты. {row['Country']} {row['Link']}")

    return exchange_rate


def str_to_float(df: pd.DataFrame, exchange_rate: float) -> pd.DataFrame:
    need_cols = set(df.columns) - set(['Apartments'])
    for col in need_cols:
        df[col] = df[col].replace('[\$€£,%]', '', regex=True).astype(float)
        if col in ['PriceUSD', 'monthlyRentUSD']:
            df[col] *= exchange_rate

    return df


def fill_reit_data(df_split: np.array, reit_data: dict, country: str, exchange_rate: float) -> dict:
    cur_city_dict = {}
    city_yields = []
    country_yields = []
    if country == 'Singapore':
        for i in range(len(df_split)):
            df = df_split[i]
            if len(df) == 0:
                continue

            neighb_name = df['Apartments'].iloc[0]
            need_df = str_to_float(df.iloc[1:-1].copy(), exchange_rate)
            city_yields.append(need_df['Yield'].values)
            cur_city_dict[neighb_name] = need_df
            if i == len(df_split)-1:
                city_name = 'Singapore'
                reit_data[country]['cities'][city_name] = cur_city_dict
                reit_data[country]['cities'][city_name]['medianYield'] = np.median(np.hstack(city_yields))
                country_yields.append(np.median(np.hstack(city_yields)))
                cur_city_dict = {}
                city_yields = []
    else:
        for df in df_split:
            if len(df) == 0:
                continue

            neighb_name = df['Apartments'].iloc[0]
            city_name = df['Apartments'].iloc[-1]
            if 'avg. Rental Yields'.lower() in city_name.lower():
                need_df = str_to_float(df.iloc[1:-1].copy(), exchange_rate)
                city_yields.append(need_df['Yield'].values)
                cur_city_dict[neighb_name] = need_df

                city_name = city_name.replace(' (all locations)', '').replace(' avg. Rental Yields', '')\
                    .replace(' avg. rental yields', '')
                reit_data[country]['cities'][city_name] = cur_city_dict
                reit_data[country]['cities'][city_name]['medianYield'] = np.median(np.hstack(city_yields))
                country_yields.append(np.median(np.hstack(city_yields)))
                cur_city_dict = {}
                city_yields = []
            else:
                need_df = str_to_float(df.iloc[1:].copy(), exchange_rate)
                city_yields.append(need_df['Yield'].values)
                cur_city_dict[neighb_name] = need_df

    reit_data[country]['medianYield'] = np.median(country_yields)

    return reit_data


def filter_globalpropertyguide(df: pd.DataFrame, agent: str) -> None:
    req = requests.Session()
    req.headers.update({'User-Agent': agent})

    # Check for 404 and old data
    reit_data = {}
    # df = df[df['Country'] == 'Singapore']
    for idx, row in tqdm(df.iterrows()):
        page = req.get(row['Link'])
        if page.status_code == 404:
            continue

        soup = BeautifulSoup(page.content, 'html.parser')
        table = soup.find('table', {'id': 'ntable'})
        last_update = table.find('td', {'class': 'tdright'})
        if last_update is None:
            print(f"Для даного линка, данных нет - {row['Link']}")
            continue

        last_update = month_corrector(last_update.text)
        how_old = (datetime.now() - last_update).days
        if how_old > 365 * 3:
            print(f"Для даного линка, данные устарели - {row['Link']}")
            continue

        # Обработка данных ---------------
        country = str(row['Country'])
        reit_data[country] = {'Link': row['Link'], 'medianYield': '', 'cities': {}}

        df = pd.read_html(str(table))[0]
        df = df[~(pd.isna(df[0]) | df[0].str.contains('- Apartments'))].iloc[:-1, :4].reset_index(drop=True)
        df.columns = ['Apartments', 'PriceUSD', 'monthlyRentUSD', 'Yield']
        exchange_rate = get_exchange_ratio(df, last_update, row)

        indices = df[pd.isna(df['Yield'])].index
        df_split = np.split(df, indices)
        reit_data = fill_reit_data(df_split, reit_data, country, exchange_rate)

    date_now = datetime.now().strftime('%Y%m%d')
    with open(fr'files\globalpropertyguide.pickle', 'wb') as f:
        pickle.dump(reit_data, f)

    return None


