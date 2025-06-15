<clickhouse>
    <logger>
        <level>information</level>
        <console>1</console>
    </logger>

    <listen_host>0.0.0.0</listen_host>
    
    <http_port>8123</http_port>
    <tcp_port>9000</tcp_port>
    <interserver_http_port>9009</interserver_http_port>

    <max_connections>${max_connections}</max_connections>
    <max_concurrent_queries>${max_concurrent_queries}</max_concurrent_queries>
    <max_server_memory_usage>${max_memory_usage}</max_server_memory_usage>
    <max_thread_pool_size>10000</max_thread_pool_size>

    <remote_servers>
        <${cluster_name}>
            %{ for shard_idx in range(shards) ~}
            <shard>
                <weight>1</weight>
                <internal_replication>true</internal_replication>
                %{ for replica_idx in range(replicas_per_shard) ~}
                <replica>
                    <host>chi-${cluster_name}-main-${shard_idx}-${replica_idx}.${cluster_name}.clickhouse.svc.cluster.local</host>
                    <port>9000</port>
                </replica>
                %{ endfor ~}
            </shard>
            %{ endfor ~}
        </${cluster_name}>
    </remote_servers>

    <zookeeper>
        <node>
            <host>clickhouse-zookeeper-0.clickhouse-zookeeper-headless.clickhouse.svc.cluster.local</host>
            <port>2181</port>
        </node>
        <node>
            <host>clickhouse-zookeeper-1.clickhouse-zookeeper-headless.clickhouse.svc.cluster.local</host>
            <port>2181</port>
        </node>
        <node>
            <host>clickhouse-zookeeper-2.clickhouse-zookeeper-headless.clickhouse.svc.cluster.local</host>
            <port>2181</port>
        </node>
    </zookeeper>


    <distributed_ddl>
        <path>/clickhouse/task_queue/ddl</path>
    </distributed_ddl>

    <format_schema_path>/var/lib/clickhouse/format_schemas/</format_schema_path>

    %{ if enable_tls ~}
    <https_port>8443</https_port>
    <tcp_port_secure>9440</tcp_port_secure>
    %{ endif ~}

    <mark_cache_size>5368709120</mark_cache_size>
    <uncompressed_cache_size>8589934592</uncompressed_cache_size>

    <query_log>
        <database>system</database>
        <table>query_log</table>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </query_log>

    <query_thread_log>
        <database>system</database>
        <table>query_thread_log</table>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </query_thread_log>

    <prometheus>
        <endpoint>/metrics</endpoint>
        <port>9363</port>
        <metrics>true</metrics>
        <asynchronous_metrics>true</asynchronous_metrics>
        <status_info>true</status_info>
    </prometheus>
</clickhouse>